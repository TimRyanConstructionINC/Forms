/**
 * Google Apps Script endpoint for the Tile Procurement Request form.
 *
 * 1. Replace SPREADSHEET_ID below.
 * 2. Deploy this script as a Web App that executes as you.
 * 3. Allow access for the intended users.
 * 4. Paste the deployment URL into GOOGLE_APPS_SCRIPT_URL in app.js.
 */

const SPREADSHEET_ID = "PASTE_SPREADSHEET_ID_HERE";
const SHEET_NAME = "Tile Procurement Requests";

const HEADERS = [
  "received_at",
  "subject",
  "project",
  "vendor",
  "date_needed_to_be_paid",
  "quote_link",
  "scope_of_work",
  "drawings_link",
  "room_count",
  "payload_json",
  "request_type",
  "light_count",
  "bulb_count",
  "slab_count",
  "total_number_of_slabs",
  "material_types",
  "purchasing_method",
  "door_hardware_quote_link",
  "front_door_notes",
  "door_count",
  "total_door_stops",
  "total_hinge_stops",
  "total_hinges",
  "hardware_types",
  "input_method",
  "knob_item_count",
  "pull_item_count",
  "ball_catch_item_count",
  "total_knob_quantity",
  "total_pull_quantity",
  "total_ball_catch_quantity",
  "finishes",
  "lead_time",
  "door_types",
  "glass_types",
  "glass_thicknesses",
  "hardware_finishes",
  "location_type",
  "item_count",
  "total_quantity",
  "suppliers",
  "date_submitted",
  "task_name",
  "task_description",
  "date_requested",
  "urgency",
  "submitted_at",
];

function doGet() {
  return jsonResponse_({
    ok: true,
    service: "Tile Procurement Request endpoint",
    sheet: SHEET_NAME,
  });
}

function doPost(event) {
  const lock = LockService.getScriptLock();

  try {
    lock.waitLock(30000);

    if (!event || !event.postData || !event.postData.contents) {
      throw new Error("The request body is empty.");
    }

    const payload = JSON.parse(event.postData.contents);
    validatePayload_(payload);

    const sheet = getOrCreateSheet_();
    ensureHeaders_(sheet);

    const receivedAt = new Date();
    const row = [
      receivedAt,
      safeCellText_(payload.subject),
      safeCellText_(payload.project),
      safeCellText_(payload.vendor),
      safeCellText_(payload.date_needed_to_be_paid),
      safeCellText_(payload.quote_link),
      safeCellText_(payload.scope_of_work),
      safeCellText_(payload.drawings_link || ""),
      Array.isArray(payload.rooms) ? payload.rooms.length : 0,
      JSON.stringify(payload),
      safeCellText_(payload.request_type || "tile"),
      countLights_(payload),
      countBulbs_(payload),
      countSlabs_(payload),
      countTotalNumberOfSlabs_(payload),
      safeCellText_(materialTypes_(payload).join(", ")),
      safeCellText_(payload.purchasing_method || ""),
      safeCellText_(payload.door_hardware_quote_link || ""),
      safeCellText_(payload.front_door_notes || ""),
      countDoors_(payload),
      numberOrBlank_(payload.house_totals && payload.house_totals.door_stops),
      numberOrBlank_(payload.house_totals && payload.house_totals.hinge_stops),
      numberOrBlank_(payload.house_totals && payload.house_totals.hinges),
      safeCellText_(hardwareTypes_(payload).join(", ")),
      safeCellText_(payload.input_method || ""),
      cabinetItemCount_(payload, "knobs"),
      cabinetItemCount_(payload, "pulls"),
      cabinetItemCount_(payload, "ball_catches"),
      cabinetQuantityTotal_(payload, "knobs"),
      cabinetQuantityTotal_(payload, "pulls"),
      cabinetQuantityTotal_(payload, "ball_catches"),
      safeCellText_(cabinetFinishes_(payload).join(", ")),
      safeCellText_(payload.lead_time || ""),
      safeCellText_(showerSummary_(payload, "door", "door_type").join(", ")),
      safeCellText_(showerSummary_(payload, "glass_specs", "glass_type").join(", ")),
      safeCellText_(showerSummary_(payload, "glass_specs", "thickness").join(", ")),
      safeCellText_(showerSummary_(payload, "hardware", "finish").join(", ")),
      safeCellText_(payload.location_type || ""),
      miscItems_(payload).length,
      miscQuantityTotal_(payload),
      safeCellText_(miscSuppliers_(payload).join(", ")),
      safeCellText_(payload.date_submitted || ""),
      safeCellText_(payload.task_name || ""),
      safeCellText_(payload.task_description || ""),
      safeCellText_(payload.date_requested || ""),
      safeCellText_(payload.urgency || ""),
      receivedAt,
    ];

    sheet.appendRow(row);
    const rowNumber = sheet.getLastRow();
    sheet.getRange(rowNumber, 1).setNumberFormat("yyyy-mm-dd hh:mm:ss");
    sheet.getRange(rowNumber, HEADERS.indexOf("submitted_at") + 1).setNumberFormat("yyyy-mm-dd hh:mm:ss");

    return jsonResponse_({ ok: true, row: rowNumber });
  } catch (error) {
    console.error(error);
    return jsonResponse_({ ok: false, error: error.message });
  } finally {
    if (lock.hasLock()) lock.releaseLock();
  }
}

function getOrCreateSheet_() {
  if (!SPREADSHEET_ID || SPREADSHEET_ID === "PASTE_SPREADSHEET_ID_HERE") {
    throw new Error("Set SPREADSHEET_ID in the Apps Script project before deploying.");
  }

  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  return spreadsheet.getSheetByName(SHEET_NAME) || spreadsheet.insertSheet(SHEET_NAME);
}

function ensureHeaders_(sheet) {
  const currentHeaders = sheet.getLastColumn()
    ? sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), HEADERS.length)).getValues()[0]
    : [];

  if (sheet.getLastRow() === 0 || currentHeaders.every((value) => value === "")) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight("bold");
    return;
  }

  const hasHeaderMismatch = currentHeaders.some((header, index) => {
    if (!header) return false;
    return header !== HEADERS[index];
  });

  if (hasHeaderMismatch) {
    throw new Error(`Sheet header mismatch. Expected: ${HEADERS.join(", ")}`);
  }

  if (currentHeaders.length < HEADERS.length || currentHeaders.some((header, index) => !header && HEADERS[index])) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight("bold");
  }
}

function validatePayload_(payload) {
  if (payload.request_type === "site_super_request") {
    const requiredSiteSuperFields = [
      "date_submitted",
      "project",
      "task_name",
      "task_description",
      "date_requested",
      "urgency",
    ];
    const missingSiteSuperFields = requiredSiteSuperFields.filter((field) => !String(payload[field] || "").trim());

    if (missingSiteSuperFields.length) {
      throw new Error(`Missing required fields: ${missingSiteSuperFields.join(", ")}`);
    }

    if (!["red", "orange", "yellow", "green"].includes(String(payload.urgency || ""))) {
      throw new Error("urgency must be red, orange, yellow, or green.");
    }

    if (!Array.isArray(payload.rooms)) {
      throw new Error("rooms must be an array.");
    }

    return;
  }

  const requiredFields = [
    "subject",
    "project",
    "vendor",
    "date_needed_to_be_paid",
    "quote_link",
    "scope_of_work",
  ];

  const missing = requiredFields.filter((field) => !String(payload[field] || "").trim());
  if (missing.length) {
    throw new Error(`Missing required fields: ${missing.join(", ")}`);
  }

  if (!Array.isArray(payload.rooms)) {
    throw new Error("rooms must be an array.");
  }

  if (payload.request_type === "miscellaneous") {
    if (!["interior", "exterior"].includes(String(payload.location_type || ""))) {
      throw new Error("location_type must be interior or exterior.");
    }

    if (!Array.isArray(payload.exterior_items)) {
      throw new Error("exterior_items must be an array.");
    }
  }
}

function countLights_(payload) {
  if (!Array.isArray(payload.rooms)) return 0;

  return payload.rooms.reduce((total, room) => {
    return total + (Array.isArray(room.lights) ? room.lights.length : 0);
  }, 0);
}

function countBulbs_(payload) {
  if (!Array.isArray(payload.rooms)) return 0;

  return payload.rooms.reduce((total, room) => {
    if (!Array.isArray(room.lights)) return total;

    return (
      total +
      room.lights.reduce((lightTotal, light) => {
        return lightTotal + (Array.isArray(light.bulbs) ? light.bulbs.length : 0);
      }, 0)
    );
  }, 0);
}

function countSlabs_(payload) {
  if (!Array.isArray(payload.rooms)) return 0;

  return payload.rooms.reduce((total, room) => {
    return total + (Array.isArray(room.slabs) ? room.slabs.length : 0);
  }, 0);
}

function countTotalNumberOfSlabs_(payload) {
  if (!Array.isArray(payload.rooms)) return 0;

  return payload.rooms.reduce((total, room) => {
    if (!Array.isArray(room.slabs)) return total;

    return (
      total +
      room.slabs.reduce((roomTotal, slab) => {
        const count = Number(slab.number_of_slabs);
        return roomTotal + (Number.isFinite(count) ? count : 0);
      }, 0)
    );
  }, 0);
}

function materialTypes_(payload) {
  if (!Array.isArray(payload.rooms)) return [];

  const values = payload.rooms.flatMap((room) => {
    if (!Array.isArray(room.slabs)) return [];
    return room.slabs.map((slab) => safeCellText_(slab.material_type || "")).filter(Boolean);
  });

  return [...new Set(values)];
}

function countDoors_(payload) {
  if (!Array.isArray(payload.rooms)) return 0;

  return payload.rooms.reduce((total, room) => {
    return total + (Array.isArray(room.doors) ? room.doors.length : 0);
  }, 0);
}

function hardwareTypes_(payload) {
  if (!Array.isArray(payload.rooms)) return [];

  const values = payload.rooms.flatMap((room) => {
    if (!Array.isArray(room.doors)) return [];
    return room.doors.flatMap((door) => {
      if (!Array.isArray(door.types)) return [];
      return door.types.map((item) => (typeof item === "string" ? item : item.type));
    });
  });

  return [...new Set(values.map((value) => safeCellText_(value || "")).filter(Boolean))];
}

function numberOrBlank_(value) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : "";
}

function cabinetItems_(payload, key) {
  if (!Array.isArray(payload.rooms)) return [];

  return payload.rooms.flatMap((room) => (Array.isArray(room[key]) ? room[key] : []));
}

function cabinetItemCount_(payload, key) {
  return cabinetItems_(payload, key).length;
}

function cabinetQuantityTotal_(payload, key) {
  return cabinetItems_(payload, key).reduce((total, item) => {
    const quantity = Number(item.quantity);
    return total + (Number.isFinite(quantity) ? quantity : 0);
  }, 0);
}

function cabinetFinishes_(payload) {
  const finishes = ["knobs", "pulls", "ball_catches"].flatMap((key) => {
    return cabinetItems_(payload, key).map((item) => safeCellText_(item.finish || "")).filter(Boolean);
  });

  return [...new Set(finishes)];
}

function miscItems_(payload) {
  if (payload.request_type !== "miscellaneous") return [];

  const rooms = Array.isArray(payload.rooms)
    ? payload.rooms.flatMap((room) => (Array.isArray(room.items) ? room.items : []))
    : [];
  const exteriorItems = Array.isArray(payload.exterior_items) ? payload.exterior_items : [];
  return rooms.concat(exteriorItems);
}

function miscQuantityTotal_(payload) {
  return miscItems_(payload).reduce((total, item) => {
    const quantity = Number(item.quantity);
    return total + (Number.isFinite(quantity) ? quantity : 0);
  }, 0);
}

function miscSuppliers_(payload) {
  const suppliers = miscItems_(payload)
    .map((item) => safeCellText_(item.supplier || ""))
    .filter(Boolean);

  return [...new Set(suppliers)];
}

function showerSummary_(payload, groupKey, fieldKey) {
  if (!Array.isArray(payload.rooms)) return [];

  const values = payload.rooms
    .map((room) => room[groupKey] && room[groupKey][fieldKey])
    .map((value) => safeCellText_(value || ""))
    .filter(Boolean);

  return [...new Set(values)];
}

// Prevent user-entered flat text from being interpreted as a Sheets formula.
function safeCellText_(value) {
  const text = String(value == null ? "" : value);
  return /^[=+\-@]/.test(text) ? `'${text}` : text;
}

function jsonResponse_(body) {
  return ContentService.createTextOutput(JSON.stringify(body)).setMimeType(
    ContentService.MimeType.JSON,
  );
}
