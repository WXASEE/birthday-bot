const { google } = require('googleapis');

function pullAugustMeetingsToSheet() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Meetings');
  sheet.clear();

  sheet.appendRow(['Date', 'Start time', 'End time', 'Meeting title', 'Meeting Details', 'Attendees', 'Calendar']);

  var startDate = new Date('2025-03-01T00:00:00Z');
  var endDate = new Date('2025-06-01T00:00:00Z');

  var calendarIDs = [
    'craig.r@invitracehealth.com',
    'jatnipat.lekh@invitracehealth.com',
    'junpen.th@invitracehealth.com',
    'kitti.l@invitracehealth.com',
    'manandeep.si@invitracehealth.com',
    'norrasaet.ma@invitracehealth.com',
    'panja.sa@invitracehealth.com',
    'surapat@invitracehealth.com',
  ];

  var timeZone = Session.getScriptTimeZone();
  var rows = [];

  calendarIDs.forEach(function(calendarID) {
    var calendar = CalendarApp.getCalendarById(calendarID);
    if (calendar) {
      var events = calendar.getEvents(startDate, endDate);

      events.forEach(function(event) {
        var startTime = event.getStartTime();
        var endTime = event.getEndTime();
        var title = event.getTitle();
        var details = event.getDescription();
        var attendees = event.getGuestList().map(function(guest) {
          return guest.getEmail();
        }).join(', ');

        rows.push([Utilities.formatDate(startTime, timeZone, 'yyyy-MM-dd'),
                   Utilities.formatDate(startTime, timeZone, 'HH:mm'),
                   Utilities.formatDate(endTime, timeZone, 'HH:mm'),
                   title,
                   details,
                   attendees,
                   calendarID]);
      });
    }
  });

  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
  }
}

module.exports = { pullAugustMeetingsToSheet };
