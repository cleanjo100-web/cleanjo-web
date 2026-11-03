/**
 * 청소해JO. 견적 신청서 → Google 스프레드시트 기록 + 메일 알림
 *
 * 쓰는 법은 backend/README.md 를 보세요. 요약:
 *   1) 새 스프레드시트 > 확장 프로그램 > Apps Script 에 이 파일 내용을 통째로 붙여 넣기
 *   2) 위쪽 함수 목록에서 setup 을 골라 한 번 실행 (권한 승인, '견적신청' 탭 생성)
 *   3) 배포 > 새 배포 > 웹 앱 (실행: 나 / 액세스: 모든 사용자) → /exec 주소를 js/config.js 의 quoteEndpoint 에
 *
 * 알림 메일 받을 주소는 아래 NOTIFY_EMAIL 에 적거나,
 * 프로젝트 설정 > 스크립트 속성에 NOTIFY_EMAIL 로 넣으세요(속성이 우선). 여러 개면 쉼표로.
 */
var NOTIFY_EMAIL = '';            // 예: 'cleanjo@gmail.com, partner@gmail.com'
var SHEET_NAME   = '견적신청';
var TZ           = 'Asia/Seoul';
var STATUS       = ['신규', '연락함', '견적 보냄', '예약 확정', '작업 완료', '진행 안 함'];

var COLS = [
  // [시트 머리글, 받는 값 이름, 열 너비]
  ['접수번호',        'no',    90],
  ['접수 시각',       'at',   140],
  ['처리 상태',       'state', 90],
  ['이름',            'name',  90],
  ['연락처',          'tel',  120],
  ['연락 편한 시간',  'when',  100],
  ['서비스',          'svc',  200],
  ['지역',            'area',  60],
  ['시·구',           'town', 130],
  ['공간 종류',       'kind',  80],
  ['평수',            'size',  60],
  ['원하는 날짜',     'date', 100],
  ['요청 사항',       'memo', 260],
  ['담당자 메모',     'note', 200],
  ['보낸 페이지',     'page', 200],
  ['신청 ID',         'id',   120]
];

/* ───────── 홈페이지에서 신청서를 보내면 실행 ───────── */
function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    var d = {};
    try { d = JSON.parse((e && e.postData && e.postData.contents) || '{}'); } catch (x) { return out(false, '잘못된 요청이에요.'); }

    // 스팸: 사람에게는 안 보이는 칸(website)이 채워져 오면 저장하지 않고 성공처럼 응답
    if (d.website) return out(true);

    // 값 정리
    var v = {};
    ['svc', 'area', 'town', 'kind', 'size', 'date', 'when', 'name', 'tel', 'memo', 'page', 'id'].forEach(function (k) {
      v[k] = clean(d[k], k === 'memo' ? 1000 : 200);
    });
    v.tel = v.tel.replace(/[^\d]/g, '');
    if (!v.name || !v.svc) return out(false, '이름과 서비스를 확인해 주세요.');
    if (!/^01\d{8,9}$/.test(v.tel)) return out(false, '휴대폰 번호를 확인해 주세요.');
    v.tel = v.tel.replace(/^(\d{3})(\d{3,4})(\d{4})$/, '$1-$2-$3');

    var sh = sheet();

    // 같은 신청이 두 번 들어오면(재전송) 한 번만 저장
    if (v.id && isDuplicate(sh, v.id)) return out(true);

    // 같은 번호로 1분 안에 다시 오면 막기
    var cache = CacheService.getScriptCache();
    if (cache.get('tel:' + v.tel)) return out(false, '방금 접수됐어요. 잠시 뒤 연락드릴게요.');
    cache.put('tel:' + v.tel, '1', 60);

    var now = new Date();
    v.at = Utilities.formatDate(now, TZ, 'yyyy-MM-dd HH:mm');
    v.no = Utilities.formatDate(now, TZ, 'MMdd') + '-' + ('00' + (countToday(sh, now) + 1)).slice(-3);
    v.state = STATUS[0];
    v.note = '';

    var row = COLS.map(function (c) { return v[c[1]] || ''; });
    sh.appendRow(row);
    var r = sh.getLastRow();
    sh.getRange(r, colOf('tel')).setNumberFormat('@').setValue(v.tel);   // 0으로 시작하는 번호 보존
    sh.getRange(r, colOf('state')).setDataValidation(statusRule());

    notify(v, r);
    return out(true, '', v.no);
  } catch (err) {
    console.error(err);
    return out(false, '잠시 문제가 생겼어요. 다시 눌러 주시거나 전화로 연락 주세요.');
  } finally {
    try { lock.releaseLock(); } catch (x) {}
  }
}

/* 주소를 브라우저로 열었을 때: 연결 확인용 */
function doGet() {
  return ContentService.createTextOutput('청소해JO. 견적 접수 주소가 정상적으로 연결되어 있어요.');
}

/* ───────── 처음 한 번 실행: 탭·머리글·서식 만들기 + 권한 승인 ───────── */
function setup() {
  var sh = sheet();
  console.log('준비 완료: ' + SpreadsheetApp.getActiveSpreadsheet().getUrl() + ' (' + sh.getName() + ' 탭)');
  var to = notifyTo();
  if (to) MailApp.sendEmail(to, '[청소해JO] 견적 알림 메일 연결 확인', '이 메일이 보이면 견적 신청 알림이 정상적으로 연결된 거예요.');
}

/* 테스트 접수 한 건 넣어 보기 (확인 후 시트에서 줄을 지우세요) */
function testPost() {
  var res = doPost({ postData: { contents: JSON.stringify({
    svc: '입주청소, 이사청소, 줄눈', area: '경기', town: '수원시 영통구', kind: '아파트', size: '32',
    date: '2026-11-20', when: '오후', name: '테스트', tel: '010-1234-5678', memo: '테스트 접수입니다', page: 'test',
    id: 'test-' + Date.now()
  }) } });
  console.log(res.getContent());
}

/* ───────── 도우미 ───────── */
function sheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME, 0);
    sh.getRange(1, 1, 1, COLS.length).setValues([COLS.map(function (c) { return c[0]; })])
      .setFontWeight('bold').setBackground('#14464A').setFontColor('#FFFFFF');
    sh.setFrozenRows(1);
    COLS.forEach(function (c, i) { sh.setColumnWidth(i + 1, c[2]); });
    sh.getRange(2, colOf('memo'), sh.getMaxRows() - 1, 1).setWrap(true);
    // 처리 상태 색
    var rng = sh.getRange(2, colOf('state'), sh.getMaxRows() - 1, 1);
    var rules = [['신규', '#FDECEA'], ['연락함', '#FFF4D6'], ['견적 보냄', '#E8F1FB'], ['예약 확정', '#DDEFEC'], ['작업 완료', '#E8EBEA'], ['진행 안 함', '#F2F2F2']]
      .map(function (x) { return SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo(x[0]).setBackground(x[1]).setRanges([rng]).build(); });
    sh.setConditionalFormatRules(rules);
    var tz = ss.getSpreadsheetTimeZone(); if (tz !== TZ) ss.setSpreadsheetTimeZone(TZ);
  }
  return sh;
}
function statusRule() { return SpreadsheetApp.newDataValidation().requireValueInList(STATUS, true).setAllowInvalid(false).build(); }
function colOf(key) { for (var i = 0; i < COLS.length; i++) if (COLS[i][1] === key) return i + 1; return -1; }

function isDuplicate(sh, id) {
  var last = sh.getLastRow(); if (last < 2) return false;
  var n = Math.min(50, last - 1);
  var ids = sh.getRange(last - n + 1, colOf('id'), n, 1).getValues();
  return ids.some(function (r) { return r[0] === id; });
}
function countToday(sh, now) {
  var last = sh.getLastRow(); if (last < 2) return 0;
  var head = Utilities.formatDate(now, TZ, 'MMdd') + '-';
  var n = Math.min(200, last - 1);
  return sh.getRange(last - n + 1, colOf('no'), n, 1).getValues().filter(function (r) { return String(r[0]).indexOf(head) === 0; }).length;
}

// 수식으로 해석되지 않게(=, +, -, @ 로 시작하면 앞에 ' 붙임), 길이 제한
function clean(x, max) {
  var s = (x === undefined || x === null) ? '' : String(x);
  s = s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, max || 200);
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return s;
}

function notifyTo() { return PropertiesService.getScriptProperties().getProperty('NOTIFY_EMAIL') || NOTIFY_EMAIL; }
function notify(v, row) {
  var to = notifyTo(); if (!to) return;
  var url = SpreadsheetApp.getActiveSpreadsheet().getUrl() + '#gid=' + sheet().getSheetId() + '&range=A' + row;
  var lines = [
    '새 견적 신청이 들어왔어요. (접수번호 ' + v.no + ')', '',
    '이름: ' + v.name,
    '연락처: ' + v.tel + (v.when ? '  (' + v.when + ')' : ''),
    '서비스: ' + v.svc,
    '지역: ' + v.area + ' ' + v.town,
    '공간: ' + v.kind + (v.size ? ', ' + v.size + '평' : ''),
    '원하는 날짜: ' + (v.date || '미정'),
    '요청 사항: ' + (v.memo ? v.memo.replace(/^'/, '') : '없음'), '',
    '시트에서 보기: ' + url
  ];
  MailApp.sendEmail({ to: to, subject: '[청소해JO 견적] ' + v.name + ' · ' + v.svc + ' · ' + v.area + ' ' + v.town, body: lines.join('\n') });
}

function out(ok, message, no) {
  return ContentService.createTextOutput(JSON.stringify({ ok: ok, message: message || '', no: no || '' }))
    .setMimeType(ContentService.MimeType.JSON);
}
