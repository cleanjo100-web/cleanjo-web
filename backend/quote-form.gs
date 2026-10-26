/**
 * 청소해JO 견적 신청서 → Google 스프레드시트 저장 + 사진 드라이브 저장 + 메일 알림
 *
 * 설정 (Apps Script 편집기 > 프로젝트 설정 > 스크립트 속성):
 *   NOTIFY_EMAIL  접수 알림을 받을 메일 주소 (여러 개면 쉼표로)
 *   FOLDER_ID     사진을 저장할 구글 드라이브 폴더 ID (주소의 /folders/ 뒤 문자열)
 * 시트는 이 스크립트가 붙어 있는 스프레드시트의 '견적신청' 탭에 쌓입니다. 없으면 자동으로 만듭니다.
 */
var SHEET_NAME = '견적신청';
var HEADERS = ['접수 시각', '서비스', '지역', '시·구', '공간 종류', '평수', '원하는 날짜', '이름', '연락처', '요청 사항', '사진', '보낸 페이지', '처리 상태'];

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    var d = JSON.parse(e.postData.contents || '{}');

    // 스팸 막기: 사람에게는 안 보이는 칸이 채워져 오면 조용히 무시
    if (d.website) return json({ ok: true });
    if (!d.name || !d.tel || !d.svc) return json({ ok: false, error: '필수 항목 누락' });

    var props = PropertiesService.getScriptProperties();
    var links = savePhotos(d.photos || [], props.getProperty('FOLDER_ID'), d.name);

    var sheet = getSheet();
    var now = Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd HH:mm');
    sheet.appendRow([now, d.svc, d.area, d.town, d.kind, d.size, d.date, d.name, "'" + d.tel, d.memo,
                     links.join('\n'), d.page, '신규']);

    var to = props.getProperty('NOTIFY_EMAIL');
    if (to) {
      var body = [
        '새 견적 신청이 들어왔습니다.', '',
        '서비스: ' + d.svc,
        '지역: ' + d.area + ' ' + d.town,
        '공간: ' + d.kind + ', ' + d.size + '평',
        '원하는 날짜: ' + (d.date || '미정'),
        '이름: ' + d.name,
        '연락처: ' + d.tel,
        '요청 사항: ' + (d.memo || '없음'),
        '사진: ' + (links.length ? links.join('\n') : '없음'), '',
        '시트: ' + SpreadsheetApp.getActiveSpreadsheet().getUrl()
      ].join('\n');
      MailApp.sendEmail({ to: to, subject: '[청소해JO 견적] ' + d.name + ' / ' + d.svc + ' / ' + d.area, body: body });
    }
    return json({ ok: true });
  } catch (err) {
    console.error(err);
    return json({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

function getSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.appendRow(HEADERS);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
  }
  return sh;
}

function savePhotos(photos, folderId, name) {
  if (!photos.length || !folderId) return [];
  var root = DriveApp.getFolderById(folderId);
  var stamp = Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyyMMdd-HHmm');
  var folder = root.createFolder(stamp + ' ' + name);
  photos.slice(0, 10).forEach(function (p, i) {
    var blob = Utilities.newBlob(Utilities.base64Decode(p.data), p.type || 'image/jpeg', (i + 1) + '_' + (p.name || 'photo.jpg'));
    folder.createFile(blob);
  });
  return [folder.getUrl()];
}

function json(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

/* 배포 전 편집기에서 한 번 실행해 권한을 승인하고 시트·메일이 되는지 확인하세요. */
function testPost() {
  var r = doPost({ postData: { contents: JSON.stringify({
    svc: '입주청소, 이사청소', area: '경기', town: '수원시 영통구', kind: '아파트', size: '32',
    date: '', name: '테스트', tel: '010-0000-0000', memo: '테스트 접수', page: 'test', photos: []
  }) } });
  console.log(r.getContent());
}
