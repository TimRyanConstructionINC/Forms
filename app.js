"use strict";

// Paste the deployed Google Apps Script Web App URL here when it is ready.
// Leave it blank to keep the form in local preview mode. For static browser
// submissions, the Apps Script Web App must be deployed with access set to
// "Anyone"; domain-only deployments often fail as a generic fetch error.
const GOOGLE_APPS_SCRIPT_URL = "https://script.google.com/a/macros/timryanconstructioninc.com/s/AKfycbzVSCiZEOZPzipsOFzpRdbGxiw3dshzVm97WtEMPJrm8-bVqsRllLN00quLaTu0PA5mZg/exec";

const form = document.querySelector("#procurement-form");
const requestTypeInput = document.querySelector("#request-type");
const roomsContainer = document.querySelector("#rooms-container");
const jsonPreview = document.querySelector("#json-preview");
const statusBox = document.querySelector("#form-status");
const submitButton = document.querySelector("#submit-button");
const printButton = document.querySelector("#print-button");
const submitHelper = document.querySelector("#submit-helper");
const modeBadge = document.querySelector("#mode-badge");
const appTitle = document.querySelector("#app-title");
const appDescription = document.querySelector("#app-description");
const roomsHeading = document.querySelector("#rooms-heading");
const roomsDescription = document.querySelector("#rooms-description");
const doorHardwareDetails = document.querySelector("#door-hardware-details");
const cabinetHardwareDetails = document.querySelector("#cabinet-hardware-details");
const showerGlassDetails = document.querySelector("#shower-glass-details");
const miscDetails = document.querySelector("#misc-details");
const siteSuperDetails = document.querySelector("#site-super-details");
const roomsSection = document.querySelector("#rooms-section");
const miscExteriorSection = document.querySelector("#misc-exterior-section");
const miscExteriorContainer = document.querySelector("#misc-exterior-container");
const procurementOnlyFields = document.querySelectorAll("[data-procurement-field]");

const requestTypes = {
  tile: {
    label: "Tile Procurement Request",
    description: "Capture payment, quote, room, material, and layout details in one request.",
    roomsHeading: "Rooms & materials",
    roomsDescription: "Add each room, then list its tile, trim, grout, and layout details.",
    roomTemplate: "room",
  },
  light: {
    label: "Light Procurement Request",
    description: "Capture payment, quote, room, fixture, finish, and bulb details in one request.",
    roomsHeading: "Rooms & lights",
    roomsDescription: "Add each room, then list its lights and bulbs.",
    roomTemplate: "lightRoom",
  },
  countertop: {
    label: "Countertop Procurement Request",
    description: "Capture payment, quote, room, slab, edge, design, and fixture details in one request.",
    roomsHeading: "Rooms & slabs",
    roomsDescription: "Add each room, then list its countertop slabs and related details.",
    roomTemplate: "countertopRoom",
  },
  door_hardware: {
    label: "Door Hardware Procurement Request",
    description: "Capture payment, quote, front door, room, door, function, keying, and hardware details in one request.",
    roomsHeading: "Rooms & doors",
    roomsDescription: "Add each room, then list its doors and hardware details.",
    roomTemplate: "doorRoom",
  },
  cabinet_hardware: {
    label: "Cabinet Hardware Procurement Request",
    description: "Capture payment, quote, room, knob, pull, and ball catch details in one request.",
    roomsHeading: "Rooms & cabinet hardware",
    roomsDescription: "Add each room, then list its knobs, pulls, and ball catches.",
    roomTemplate: "cabinetRoom",
  },
  shower_glass: {
    label: "Shower Glass Procurement Request",
    description: "Capture payment, quote, lead time, room, enclosure, glass, door, and hardware details in one request.",
    roomsHeading: "Rooms & shower glass",
    roomsDescription: "Add each shower glass room or enclosure location.",
    roomTemplate: "showerRoom",
  },
  miscellaneous: {
    label: "Miscellaneous Procurement Request",
    description: "Capture payment, quote, and miscellaneous interior or exterior item details in one request.",
    roomsHeading: "Interior rooms",
    roomsDescription: "Add each interior miscellaneous room item.",
    roomTemplate: "miscRoom",
  },
  site_super_request: {
    label: "Site Super Request",
    description: "Submit a project task request for site staff with requested date and urgency.",
    roomsHeading: "",
    roomsDescription: "",
    roomTemplate: null,
  },
};

const templates = {
  room: document.querySelector("#room-template"),
  lightRoom: document.querySelector("#light-room-template"),
  countertopRoom: document.querySelector("#countertop-room-template"),
  doorRoom: document.querySelector("#door-room-template"),
  cabinetRoom: document.querySelector("#cabinet-room-template"),
  showerRoom: document.querySelector("#shower-room-template"),
  miscRoom: document.querySelector("#misc-room-template"),
  tile: document.querySelector("#tile-template"),
  trim: document.querySelector("#trim-template"),
  grout: document.querySelector("#grout-template"),
  light: document.querySelector("#light-template"),
  bulb: document.querySelector("#bulb-template"),
  slab: document.querySelector("#slab-template"),
  door: document.querySelector("#door-template"),
  cabinetKnob: document.querySelector("#cabinet-knob-template"),
  cabinetPull: document.querySelector("#cabinet-pull-template"),
  cabinetBallCatch: document.querySelector("#cabinet-ball-catch-template"),
  miscItem: document.querySelector("#misc-item-template"),
  miscExteriorItem: document.querySelector("#misc-exterior-item-template"),
};

function createId(prefix) {
  const uniquePart = globalThis.crypto?.randomUUID
    ? globalThis.crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}-${uniquePart}`;
}

function cloneTemplate(name) {
  return templates[name].content.firstElementChild.cloneNode(true);
}

function getRequestType() {
  const type = requestTypeInput?.value;
  return Object.prototype.hasOwnProperty.call(requestTypes, type) ? type : "tile";
}

function getRequestConfig() {
  return requestTypes[getRequestType()];
}

function isSiteSuperRequest() {
  return getRequestType() === "site_super_request";
}

function todayDateValue() {
  const today = new Date();
  const localToday = new Date(today.getTime() - today.getTimezoneOffset() * 60000);
  return localToday.toISOString().slice(0, 10);
}

function ensureDateSubmittedDefault() {
  const dateSubmitted = siteSuperDetails.querySelector('[data-site-super-field="date_submitted"]');
  if (dateSubmitted && !dateSubmitted.value) {
    dateSubmitted.value = todayDateValue();
  }
}

function applyRequestTypeCopy() {
  const config = getRequestConfig();
  document.body.dataset.requestType = getRequestType();
  document.title = config.label;
  appTitle.textContent = config.label;
  appDescription.textContent = config.description;
  roomsHeading.textContent = config.roomsHeading;
  roomsDescription.textContent = config.roomsDescription;
  syncDoorHardwareDetails();
  syncCabinetHardwareDetails();
  syncShowerGlassDetails();
  syncMiscDetails();
  syncSiteSuperDetails();
  syncRoomsSectionVisibility();
}

function resetRoomsForRequestType() {
  revokeImagePreviews(roomsContainer);
  roomsContainer.replaceChildren();
  miscExteriorContainer.replaceChildren();
  if (!isSiteSuperRequest()) {
    addRoom();
  }
  if (getRequestType() === "miscellaneous" && radioValue("misc_location_type") === "exterior") {
    addMiscExteriorItem();
  }
  syncRoomsSectionVisibility();
  updatePreview();
}

function addRoom() {
  const sourceDoor = getRequestType() === "door_hardware" ? getLastDoor() : null;
  const room = cloneTemplate(getRequestConfig().roomTemplate);
  room.dataset.id = createId("room");
  roomsContainer.append(room);

  if (getRequestType() === "light") {
    addLight(room);
  } else if (getRequestType() === "countertop") {
    addSlab(room);
  } else if (getRequestType() === "door_hardware") {
    addDoor(room, sourceDoor);
  } else if (getRequestType() === "cabinet_hardware") {
    // Cabinet rooms start with empty hardware sections so blank placeholder items are not submitted.
  } else if (getRequestType() === "shower_glass") {
    syncShowerGlassConditionalFields(room);
  } else if (getRequestType() === "miscellaneous") {
    addMiscItem(room);
  } else {
    addTile(room);
  }

  renumberAll();
  updatePreview();
  room.querySelector('[data-field="room_name"], [data-field="name"]')?.focus();
}

function addTile(room) {
  const tile = cloneTemplate("tile");
  tile.dataset.id = createId("tile");
  room.querySelector('[data-list="tiles"]').append(tile);
  renumberItems(room, "tile");
  updatePreview();
}

function addTrim(room) {
  const trim = cloneTemplate("trim");
  trim.dataset.id = createId("trim");
  room.querySelector('[data-list="trim"]').append(trim);
  renumberItems(room, "trim");
  updatePreview();
}

function addGrout(room) {
  const grout = cloneTemplate("grout");
  grout.dataset.id = createId("grout");
  room.querySelector('[data-list="grout"]').append(grout);
  renumberItems(room, "grout");
  updatePreview();
}

function addLight(room) {
  const light = cloneTemplate("light");
  light.dataset.id = createId("light");
  room.querySelector('[data-list="lights"]').append(light);
  addBulb(light);
  syncLightConditionalFields(light);
  renumberItems(room, "light");
  updatePreview();
}

function addBulb(light) {
  const bulb = cloneTemplate("bulb");
  bulb.dataset.id = createId("bulb");
  light.querySelector('[data-list="bulbs"]').append(bulb);
  renumberBulbs(light);
  updatePreview();
}

function addSlab(room) {
  const slab = cloneTemplate("slab");
  slab.dataset.id = createId("slab");
  room.querySelector('[data-list="slabs"]').append(slab);
  renumberItems(room, "slab");
  updatePreview();
}

function addDoor(room, sourceDoor = getLastDoor(room) || getLastDoor()) {
  const door = cloneTemplate("door");
  door.dataset.id = createId("door");
  room.querySelector('[data-list="doors"]').append(door);
  if (sourceDoor) {
    copyDoorValues(sourceDoor, door);
  }
  syncDoorTypeQuantities(door, { clearInactive: false });
  renumberItems(room, "door");
  updatePreview();
}

function addCabinetHardwareItem(room, itemType) {
  const templateNames = {
    knob: "cabinetKnob",
    pull: "cabinetPull",
    "ball-catch": "cabinetBallCatch",
  };
  const listNames = {
    knob: "knobs",
    pull: "pulls",
    "ball-catch": "ball-catches",
  };
  const item = cloneTemplate(templateNames[itemType]);
  item.dataset.id = createId(itemType);
  room.querySelector(`[data-list="${listNames[itemType]}"]`).append(item);
  renumberItems(room, itemType);
  updatePreview();
}

function addMiscItem(room) {
  const item = cloneTemplate("miscItem");
  item.dataset.id = createId("misc-item");
  room.querySelector('[data-list="misc-items"]').append(item);
  renumberItems(room, "misc-item");
  updatePreview();
}

function addMiscExteriorItem() {
  const item = cloneTemplate("miscExteriorItem");
  item.dataset.id = createId("exterior-item");
  miscExteriorContainer.append(item);
  renumberItems(miscExteriorContainer, "exterior-item");
  updatePreview();
}

function renumberAll() {
  roomsContainer.querySelectorAll("[data-room]").forEach((room, index) => {
    const number = index + 1;
    room.querySelector("[data-room-number]").textContent = number;
    room.querySelector("[data-room-title]").textContent = `Room ${number}`;
    room.querySelector('[data-action="remove-room"]').setAttribute("aria-label", `Remove room ${number}`);

    if (getRequestType() === "light") {
      renumberItems(room, "light");
    } else if (getRequestType() === "countertop") {
      renumberItems(room, "slab");
    } else if (getRequestType() === "door_hardware") {
      renumberItems(room, "door");
    } else if (getRequestType() === "cabinet_hardware") {
      renumberItems(room, "knob");
      renumberItems(room, "pull");
      renumberItems(room, "ball-catch");
    } else if (getRequestType() === "miscellaneous") {
      renumberItems(room, "misc-item");
    } else {
      renumberItems(room, "tile");
      renumberItems(room, "trim");
      renumberItems(room, "grout");
    }
  });
}

function renumberItems(container, type) {
  container.querySelectorAll(`[data-item="${type}"]`).forEach((item, index) => {
    const itemLabels = {
      "ball-catch": "Ball Catch",
      "exterior-item": "Exterior Item",
      "misc-item": "Item",
    };
    const displayType = itemLabels[type] ?? `${type.charAt(0).toUpperCase()}${type.slice(1)}`;
    const label = `${displayType} ${index + 1}`;
    item.querySelector("[data-item-title]").textContent = label;
    item.querySelector('[data-action="remove-item"]').setAttribute("aria-label", `Remove ${label.toLowerCase()}`);

    if (type === "light") {
      renumberBulbs(item);
    }
  });
}

function renumberBulbs(light) {
  light.querySelectorAll('[data-item="bulb"]').forEach((bulb, index) => {
    const label = `Bulb ${index + 1}`;
    bulb.querySelector("[data-item-title]").textContent = label;
    bulb.querySelector('[data-action="remove-item"]').setAttribute("aria-label", `Remove ${label.toLowerCase()}`);
  });
}

function valueOf(container, fieldName, selectorPrefix = "data-field") {
  return container.querySelector(`[${selectorPrefix}="${fieldName}"]`)?.value.trim() ?? "";
}

function numericValueOf(container, fieldName, selectorPrefix = "data-field") {
  const value = valueOf(container, fieldName, selectorPrefix);
  return value === "" ? null : Number(value);
}

function checkedOf(container, fieldName, selectorPrefix = "data-field") {
  return Boolean(container.querySelector(`[${selectorPrefix}="${fieldName}"]`)?.checked);
}

function radioValue(name) {
  return form.querySelector(`input[name="${name}"]:checked`)?.value ?? "";
}

function selectedDoorTypes(door) {
  return [...door.querySelectorAll("[data-type-value]:checked")].map((input) => input.dataset.typeValue);
}

function getLastDoor(scope = roomsContainer) {
  const doors = [...scope.querySelectorAll('[data-item="door"]')];
  return doors.length ? doors[doors.length - 1] : null;
}

function setDoorTypeValues(door, values) {
  const selectedValues = new Set(values);
  door.querySelectorAll("[data-type-value]").forEach((input) => {
    input.checked = selectedValues.has(input.dataset.typeValue);
  });
}

function syncDoorTypeQuantities(door, { clearInactive = true } = {}) {
  const selectedTypes = new Set(selectedDoorTypes(door));

  door.querySelectorAll("[data-type-config-row]").forEach((row) => {
    const isActive = selectedTypes.has(row.dataset.typeConfigRow);
    const fields = row.querySelector(".type-config-fields");
    if (fields) fields.hidden = !isActive;
    row.querySelectorAll("input").forEach((input) => {
      if (input.matches("[data-type-value]")) return;
      input.disabled = !isActive;
      if (clearInactive && !isActive) {
        input.value = "";
      }
    });
  });
}

function copyDoorValues(sourceDoor, targetDoor) {
  [
    "door_name",
    "backset_option",
    "back_plate_style",
    "door_thickness",
    "door_hand",
    "function",
  ].forEach((fieldName) => {
    const target = targetDoor.querySelector(`[data-field="${fieldName}"]`);
    if (target) target.value = valueOf(sourceDoor, fieldName);
  });

  const keyInstructions = targetDoor.querySelector('[data-field="key_instructions"]');
  if (keyInstructions) keyInstructions.value = "";

  const selectedTypes = selectedDoorTypes(sourceDoor);
  setDoorTypeValues(targetDoor, selectedTypes);

  selectedTypes.forEach((type) => {
    ["name", "finish", "quantity"].forEach((detail) => {
      const targetInput = targetDoor.querySelector(`[data-type-${detail}="${type}"]`);
      if (targetInput) {
        targetInput.value = valueOf(sourceDoor, type, `data-type-${detail}`);
      }
    });
  });
}

function revokeImagePreviews(container) {
  container.querySelectorAll("[data-preview-url]").forEach((element) => {
    URL.revokeObjectURL(element.dataset.previewUrl);
    delete element.dataset.previewUrl;
  });
}

function clearImageGroup(group) {
  const preview = group.querySelector("[data-image-preview]");
  const input = group.querySelector("[data-image-input]");
  const name = group.querySelector("[data-image-name]");

  if (group.dataset.previewUrl) {
    URL.revokeObjectURL(group.dataset.previewUrl);
  }

  delete group.dataset.previewUrl;
  delete group.dataset.imageName;
  delete group.dataset.imageType;
  delete group.dataset.imageUrl;

  if (input) {
    input.value = "";
    input.setCustomValidity("");
  }
  if (preview) {
    preview.removeAttribute("src");
    preview.hidden = true;
  }
  if (name) {
    name.textContent = "No image selected.";
  }
}

function handleImageSelection(input) {
  const group = input.closest("[data-image-group]");
  const file = input.files?.[0];

  clearImageGroup(group);

  if (!file) {
    updatePreview();
    return;
  }

  if (!file.type.startsWith("image/")) {
    input.setCustomValidity("Select an image file.");
    input.reportValidity();
    updatePreview();
    return;
  }

  const previewUrl = URL.createObjectURL(file);
  const preview = group.querySelector("[data-image-preview]");
  const name = group.querySelector("[data-image-name]");

  group.dataset.previewUrl = previewUrl;
  group.dataset.imageName = file.name;
  group.dataset.imageType = file.type;
  group.dataset.imageUrl = "";
  input.setCustomValidity("");

  if (preview) {
    preview.src = previewUrl;
    preview.hidden = false;
  }
  if (name) {
    name.textContent = file.name;
  }

  updatePreview();
}

function setConditionalFieldState(field, isVisible) {
  field.hidden = !isVisible;
  field.querySelectorAll("input, select, textarea").forEach((input) => {
    input.disabled = !isVisible;
    if (!isVisible) {
      if (input.type === "checkbox") {
        input.checked = false;
      } else {
        input.value = "";
      }
    }
  });
}

function syncLightConditionalFields(light) {
  const type = valueOf(light, "type");
  const showOtherType = type === "Other";
  const showFanFields = type === "Fan";

  light
    .querySelectorAll('[data-conditional="other-type"]')
    .forEach((field) => setConditionalFieldState(field, showOtherType));
  light
    .querySelectorAll('[data-conditional="fan-field"]')
    .forEach((field) => setConditionalFieldState(field, showFanFields));
}

function syncDoorMethodPanels({ clearInactive = true } = {}) {
  const method = radioValue("door_purchasing_method");

  doorHardwareDetails.querySelectorAll("[data-door-method-panel]").forEach((panel) => {
    const isActive = panel.dataset.doorMethodPanel === method;
    panel.hidden = !isActive;
    panel.querySelectorAll("input, select, textarea").forEach((input) => {
      input.disabled = !isActive;
      if (clearInactive && !isActive) {
        input.value = "";
      }
      input.required = isActive && input.matches('[data-door-field="door_hardware_quote_link"]');
    });
  });
}

function syncDoorHardwareDetails() {
  const isDoorHardware = getRequestType() === "door_hardware";

  doorHardwareDetails.hidden = !isDoorHardware;
  doorHardwareDetails.querySelectorAll("input, select, textarea").forEach((input) => {
    input.disabled = !isDoorHardware;
  });

  if (!isDoorHardware) {
    doorHardwareDetails.querySelectorAll("input, select, textarea").forEach((input) => {
      if (input.type === "radio" || input.type === "checkbox") {
        input.checked = false;
      } else {
        input.value = "";
      }
      input.required = false;
    });
    return;
  }

  doorHardwareDetails
    .querySelectorAll('input[name="door_purchasing_method"]')
    .forEach((input) => {
      input.required = true;
    });
  syncDoorMethodPanels({ clearInactive: false });
}

function syncCabinetHardwareDetails() {
  const isCabinetHardware = getRequestType() === "cabinet_hardware";

  cabinetHardwareDetails.hidden = !isCabinetHardware;
  cabinetHardwareDetails.querySelectorAll("input, select, textarea").forEach((input) => {
    input.disabled = !isCabinetHardware;
  });

  if (!isCabinetHardware) {
    cabinetHardwareDetails.querySelectorAll("input, select, textarea").forEach((input) => {
      if (input.type === "radio" || input.type === "checkbox") {
        input.checked = false;
      } else {
        input.value = "";
      }
      input.required = false;
    });
    return;
  }

  cabinetHardwareDetails
    .querySelectorAll('input[name="cabinet_input_method"]')
    .forEach((input) => {
      input.required = true;
    });
}

function syncShowerGlassDetails() {
  const isShowerGlass = getRequestType() === "shower_glass";

  showerGlassDetails.hidden = !isShowerGlass;
  showerGlassDetails.querySelectorAll("input, select, textarea").forEach((input) => {
    input.disabled = !isShowerGlass;
    if (!isShowerGlass) {
      input.value = "";
    }
  });
}

function syncMiscDetails() {
  const isMisc = getRequestType() === "miscellaneous";

  miscDetails.hidden = !isMisc;
  miscDetails.querySelectorAll("input, select, textarea").forEach((input) => {
    input.disabled = !isMisc;
    if (!isMisc) {
      if (input.type === "radio" || input.type === "checkbox") {
        input.checked = false;
      } else {
        input.value = "";
      }
      input.required = false;
    }
  });

  if (isMisc) {
    miscDetails.querySelectorAll('input[name="misc_location_type"]').forEach((input) => {
      input.required = true;
    });
  }
}

function syncSiteSuperDetails() {
  const isSiteSuper = isSiteSuperRequest();

  siteSuperDetails.hidden = !isSiteSuper;
  siteSuperDetails.querySelectorAll("input, select, textarea").forEach((input) => {
    input.disabled = !isSiteSuper;
    if (!isSiteSuper) {
      if (input.type === "radio" || input.type === "checkbox") {
        input.checked = false;
      } else {
        input.value = "";
      }
      input.required = false;
    }
  });

  procurementOnlyFields.forEach((field) => {
    field.hidden = isSiteSuper;
    field.querySelectorAll("input, select, textarea").forEach((input) => {
      input.disabled = isSiteSuper;
    });
  });

  if (isSiteSuper) {
    ensureDateSubmittedDefault();
    siteSuperDetails.querySelectorAll("[data-site-super-field], input[name='site_super_urgency']").forEach((input) => {
      input.required = true;
    });
  }
}

function syncRoomsSectionVisibility() {
  const isCabinetQuoteOnly =
    getRequestType() === "cabinet_hardware" && radioValue("cabinet_input_method") !== "hardware_details";
  const isMiscExterior =
    getRequestType() === "miscellaneous" && radioValue("misc_location_type") !== "interior";
  const hideRooms = isCabinetQuoteOnly || isMiscExterior || isSiteSuperRequest();

  roomsSection.hidden = hideRooms;
  roomsSection.querySelectorAll("input, select, textarea, button").forEach((control) => {
    control.disabled = hideRooms;
  });

  const showMiscExterior = getRequestType() === "miscellaneous" && radioValue("misc_location_type") === "exterior";
  miscExteriorSection.hidden = !showMiscExterior;
  miscExteriorSection.querySelectorAll("input, select, textarea, button").forEach((control) => {
    control.disabled = !showMiscExterior;
  });
}

function syncShowerGlassConditionalFields(room) {
  const doorType = valueOf(room, "door_type", "data-door-config-field");
  const glassType = valueOf(room, "glass_type", "data-glass-field");
  const includesSideFields = doorType === "hinged_pivot" || doorType === "sliding";
  const isOtherGlass = glassType === "other";
  const showsDoorSideFields = doorType === "hinged_pivot" || doorType === "sliding";
  const swingLabel = room.querySelector("[data-shower-swing-label]");
  const hingeLabel = room.querySelector("[data-shower-hinge-label]");
  const swingPlaceholder = room.querySelector('[data-door-config-field="swing_direction"] option[value=""]');
  const hingePlaceholder = room.querySelector('[data-door-config-field="hinge_side"] option[value=""]');

  if (swingLabel) swingLabel.textContent = doorType === "sliding" ? "Placement side" : "Swing Direction";
  if (hingeLabel) hingeLabel.textContent = doorType === "sliding" ? "Sliding Side" : "Hinge Side";
  if (swingPlaceholder) {
    swingPlaceholder.textContent =
      doorType === "sliding" ? "Select placement side" : "Select swing direction";
  }
  if (hingePlaceholder) {
    hingePlaceholder.textContent = doorType === "sliding" ? "Select sliding side" : "Select hinge side";
  }

  room
    .querySelectorAll('[data-conditional="shower-hinged-field"]')
    .forEach((field) => setConditionalFieldState(field, showsDoorSideFields));
  room
    .querySelectorAll('[data-conditional="shower-other-glass"]')
    .forEach((field) => {
      setConditionalFieldState(field, isOtherGlass);
      field.querySelectorAll("input, select, textarea").forEach((input) => {
        input.required = isOtherGlass;
      });
    });
}

function serializeTile(tile) {
  return {
    id: tile.dataset.id,
    sqft: numericValueOf(tile, "sqft"),
    boxes_ordered: numericValueOf(tile, "boxes_ordered"),
    item_name: valueOf(tile, "item_name"),
    nominal_dimensions: valueOf(tile, "nominal_dimensions"),
    finish: valueOf(tile, "finish"),
    color: valueOf(tile, "color"),
    joint_width: valueOf(tile, "joint_width"),
    notes: valueOf(tile, "notes"),
    details: valueOf(tile, "details"),
    layout: {
      origin_point: valueOf(tile, "origin_point", "data-layout-field"),
      direction: valueOf(tile, "direction", "data-layout-field"),
      transitions: valueOf(tile, "transitions", "data-layout-field"),
      area_sqft: numericValueOf(tile, "area_sqft", "data-layout-field"),
    },
  };
}

function serializeTrim(trim) {
  return {
    id: trim.dataset.id,
    type: valueOf(trim, "type"),
    quantity: numericValueOf(trim, "quantity"),
    notes: valueOf(trim, "notes"),
  };
}

function serializeGrout(grout) {
  return {
    id: grout.dataset.id,
    brand: valueOf(grout, "brand"),
    color: valueOf(grout, "color"),
    quantity: numericValueOf(grout, "quantity"),
    notes: valueOf(grout, "notes"),
  };
}

function serializeBulb(bulb) {
  return {
    id: bulb.dataset.id,
    dimmable: checkedOf(bulb, "dimmable"),
    kelvin: valueOf(bulb, "kelvin"),
    watts: valueOf(bulb, "watts"),
    quantity: numericValueOf(bulb, "quantity"),
    finish: valueOf(bulb, "finish"),
    shape: valueOf(bulb, "shape"),
    mixed_metals_flag: checkedOf(bulb, "mixed_metals_flag"),
    non_returnable: checkedOf(bulb, "non_returnable"),
  };
}

function serializeLight(light) {
  const type = valueOf(light, "type");
  const isFan = type === "Fan";
  const isOther = type === "Other";

  return {
    id: light.dataset.id,
    type,
    other_type: isOther ? valueOf(light, "other_type") : "",
    location_type: valueOf(light, "location_type"),
    quantity: numericValueOf(light, "quantity"),
    rod_type: isFan ? valueOf(light, "rod_type") : "",
    blade: isFan ? valueOf(light, "blade") : "",
    size: valueOf(light, "size"),
    finish: valueOf(light, "finish"),
    hanging_height: valueOf(light, "hanging_height"),
    finishes: {
      body: valueOf(light, "body", "data-finish-field"),
      socket: valueOf(light, "socket", "data-finish-field"),
      cord_chain: valueOf(light, "cord_chain", "data-finish-field"),
      accent_hardware: valueOf(light, "accent_hardware", "data-finish-field"),
      shade_detail: valueOf(light, "shade_detail", "data-finish-field"),
    },
    diameter: valueOf(light, "diameter"),
    glass_finish: valueOf(light, "glass_finish"),
    shade_detail: valueOf(light, "shade_detail"),
    bulbs: [...light.querySelectorAll('[data-item="bulb"]')].map(serializeBulb),
  };
}

function serializeImage(group) {
  return {
    name: group?.dataset.imageName ?? "",
    type: group?.dataset.imageType ?? "",
    url: group?.dataset.imageUrl ?? "",
  };
}

function serializeImageSection(slab, groupName, descriptionSelectorPrefix) {
  const group = slab.querySelector(`[data-image-group="${groupName}"]`);

  return {
    description: valueOf(slab, "description", descriptionSelectorPrefix),
    image: serializeImage(group),
  };
}

function serializeLinkQuantityGroup(slab, selectorPrefix) {
  return {
    url: valueOf(slab, "url", selectorPrefix),
    quantity: numericValueOf(slab, "quantity", selectorPrefix),
  };
}

function serializeSlab(slab) {
  return {
    id: slab.dataset.id,
    material_type: valueOf(slab, "material_type"),
    slab_measurements: valueOf(slab, "slab_measurements"),
    number_of_slabs: numericValueOf(slab, "number_of_slabs"),
    edge_details: serializeImageSection(slab, "edge_details", "data-edge-field"),
    perimeter_island_design: serializeImageSection(
      slab,
      "perimeter_island_design",
      "data-design-field",
    ),
    backsplash: serializeImageSection(slab, "backsplash", "data-backsplash-field"),
    plumbing_hardware: serializeLinkQuantityGroup(slab, "data-plumbing-field"),
    sinks: serializeLinkQuantityGroup(slab, "data-sinks-field"),
    tub: serializeLinkQuantityGroup(slab, "data-tub-field"),
  };
}

function serializeDoor(door) {
  const types = selectedDoorTypes(door).map((type) => ({
    type,
    name: valueOf(door, type, "data-type-name"),
    finish: valueOf(door, type, "data-type-finish"),
    quantity: numericValueOf(door, type, "data-type-quantity"),
  }));

  return {
    id: door.dataset.id,
    door_name: valueOf(door, "door_name"),
    backset_option: valueOf(door, "backset_option"),
    back_plate_style: valueOf(door, "back_plate_style"),
    door_thickness: valueOf(door, "door_thickness"),
    door_hand: valueOf(door, "door_hand"),
    key_instructions: valueOf(door, "key_instructions"),
    types,
    function: valueOf(door, "function"),
  };
}

function serializeCabinetHardwareItem(item) {
  return {
    id: item.dataset.id,
    name: valueOf(item, "name"),
    quantity: numericValueOf(item, "quantity"),
    length: valueOf(item, "length"),
    finish: valueOf(item, "finish"),
  };
}

function serializeTileRoom(room) {
  return {
    id: room.dataset.id,
    room_name: valueOf(room, "room_name"),
    tiles: [...room.querySelectorAll('[data-item="tile"]')].map(serializeTile),
    trim_items: [...room.querySelectorAll('[data-item="trim"]')].map(serializeTrim),
    grout_items: [...room.querySelectorAll('[data-item="grout"]')].map(serializeGrout),
  };
}

function serializeLightRoom(room) {
  return {
    id: room.dataset.id,
    room_name: valueOf(room, "room_name"),
    lights: [...room.querySelectorAll('[data-item="light"]')].map(serializeLight),
  };
}

function serializeCountertopRoom(room) {
  return {
    id: room.dataset.id,
    room_name: valueOf(room, "room_name"),
    slabs: [...room.querySelectorAll('[data-item="slab"]')].map(serializeSlab),
  };
}

function serializeDoorRoom(room) {
  return {
    id: room.dataset.id,
    room_name: valueOf(room, "room_name"),
    doors: [...room.querySelectorAll('[data-item="door"]')].map(serializeDoor),
  };
}

function serializeCabinetRoom(room) {
  return {
    id: room.dataset.id,
    room_name: valueOf(room, "room_name"),
    knobs: [...room.querySelectorAll('[data-item="knob"]')].map(serializeCabinetHardwareItem),
    pulls: [...room.querySelectorAll('[data-item="pull"]')].map(serializeCabinetHardwareItem),
    ball_catches: [...room.querySelectorAll('[data-item="ball-catch"]')].map(serializeCabinetHardwareItem),
  };
}

function serializeMiscItem(item) {
  return {
    id: item.dataset.id,
    name: valueOf(item, "name"),
    quantity: numericValueOf(item, "quantity"),
    supplier: valueOf(item, "supplier"),
    details: valueOf(item, "details"),
  };
}

function hasMiscItemContent(item) {
  return (
    item.quantity !== null ||
    ["name", "supplier", "details"].some((key) => String(item[key] ?? "").trim())
  );
}

function serializeMiscRoom(room) {
  const items = [...room.querySelectorAll('[data-item="misc-item"]')]
    .map(serializeMiscItem)
    .filter(hasMiscItemContent);

  return {
    id: room.dataset.id,
    room_name: valueOf(room, "room_name"),
    items,
  };
}

function hasMiscRoomContent(room) {
  return String(room.room_name ?? "").trim() || (room.items ?? []).length > 0;
}

function buildMiscDetails() {
  const locationType = radioValue("misc_location_type");

  return {
    location_type: locationType,
    exterior_items:
      locationType === "exterior"
        ? [...miscExteriorContainer.querySelectorAll('[data-item="exterior-item"]')]
            .map(serializeMiscItem)
            .filter(hasMiscItemContent)
        : [],
  };
}

function buildSiteSuperPayload(data) {
  return {
    schema_version: 1,
    request_type: "site_super_request",
    date_submitted: valueOf(siteSuperDetails, "date_submitted", "data-site-super-field"),
    project: String(data.get("project") ?? "").trim(),
    task_name: valueOf(siteSuperDetails, "task_name", "data-site-super-field"),
    task_description: valueOf(siteSuperDetails, "task_description", "data-site-super-field"),
    date_requested: valueOf(siteSuperDetails, "date_requested", "data-site-super-field"),
    urgency: radioValue("site_super_urgency"),
    submitted_at: null,
    rooms: [],
  };
}

function buildCabinetHardwareDetails() {
  return {
    input_method: radioValue("cabinet_input_method"),
  };
}

function serializeShowerGlassRoom(room) {
  const doorType = valueOf(room, "door_type", "data-door-config-field");
  const glassType = valueOf(room, "glass_type", "data-glass-field");
  const includesSideFields = doorType === "hinged_pivot" || doorType === "sliding";

  return {
    id: room.dataset.id,
    room_name: valueOf(room, "room_name"),
    framing: valueOf(room, "framing"),
    enclosure_layout: valueOf(room, "enclosure_layout"),
    door: {
      door_type: doorType,
      swing_direction:
        includesSideFields
          ? valueOf(room, "swing_direction", "data-door-config-field")
          : "",
      hinge_side:
        includesSideFields
          ? valueOf(room, "hinge_side", "data-door-config-field")
          : "",
    },
    glass_specs: {
      thickness: valueOf(room, "thickness", "data-glass-field"),
      glass_type: glassType,
      other_glass_type:
        glassType === "other" ? valueOf(room, "other_glass_type", "data-glass-field") : "",
    },
    hardware: {
      finish: valueOf(room, "finish", "data-hardware-field"),
      style: valueOf(room, "style", "data-hardware-field"),
    },
    notes: valueOf(room, "notes"),
  };
}

function buildShowerGlassDetails() {
  return {
    lead_time: valueOf(showerGlassDetails, "lead_time", "data-shower-field"),
  };
}

function buildDoorHardwareDetails() {
  const purchasingMethod = radioValue("door_purchasing_method");

  return {
    purchasing_method: purchasingMethod,
    door_hardware_quote_link:
      purchasingMethod === "quote_link"
        ? valueOf(doorHardwareDetails, "door_hardware_quote_link", "data-door-field")
        : "",
    house_totals:
      purchasingMethod === "house_totals"
        ? {
            door_stops: numericValueOf(doorHardwareDetails, "door_stops", "data-house-total-field"),
            hinge_stops: numericValueOf(doorHardwareDetails, "hinge_stops", "data-house-total-field"),
            hinges: numericValueOf(doorHardwareDetails, "hinges", "data-house-total-field"),
          }
        : null,
    front_door_notes: valueOf(doorHardwareDetails, "front_door_notes", "data-door-field"),
  };
}

function buildPayload() {
  const data = new FormData(form);
  const requestType = getRequestType();

  if (requestType === "site_super_request") {
    return buildSiteSuperPayload(data);
  }

  const roomSerializers = {
    tile: serializeTileRoom,
    light: serializeLightRoom,
    countertop: serializeCountertopRoom,
    door_hardware: serializeDoorRoom,
    cabinet_hardware: serializeCabinetRoom,
    shower_glass: serializeShowerGlassRoom,
    miscellaneous: serializeMiscRoom,
  };
  const roomSerializer = roomSerializers[requestType] ?? serializeTileRoom;
  const shouldSerializeRooms =
    (requestType !== "cabinet_hardware" || radioValue("cabinet_input_method") === "hardware_details") &&
    (requestType !== "miscellaneous" || radioValue("misc_location_type") === "interior");
  const serializedRooms = shouldSerializeRooms
    ? [...roomsContainer.querySelectorAll("[data-room]")].map(roomSerializer)
    : [];

  const payload = {
    schema_version: 1,
    request_type: requestType,
    subject: String(data.get("subject") ?? "").trim(),
    date_needed_to_be_paid: String(data.get("date_needed_to_be_paid") ?? "").trim(),
    project: String(data.get("project") ?? "").trim(),
    vendor: String(data.get("vendor") ?? "").trim(),
    quote_link: String(data.get("quote_link") ?? "").trim(),
    scope_of_work: String(data.get("scope_of_work") ?? "").trim(),
    drawings_link: String(data.get("drawings_link") ?? "").trim(),
    submitted_at: null,
    rooms:
      requestType === "miscellaneous"
        ? serializedRooms.filter(hasMiscRoomContent)
        : serializedRooms,
  };

  if (requestType === "door_hardware") {
    Object.assign(payload, buildDoorHardwareDetails());
  }
  if (requestType === "cabinet_hardware") {
    Object.assign(payload, buildCabinetHardwareDetails());
  }
  if (requestType === "shower_glass") {
    Object.assign(payload, buildShowerGlassDetails());
  }
  if (requestType === "miscellaneous") {
    Object.assign(payload, buildMiscDetails());
  }

  return payload;
}

function getPayloadCounts(payload) {
  const lightCount = payload.rooms.reduce((total, room) => total + (room.lights?.length ?? 0), 0);
  const bulbCount = payload.rooms.reduce(
    (total, room) =>
      total + (room.lights ?? []).reduce((roomTotal, light) => roomTotal + (light.bulbs?.length ?? 0), 0),
    0,
  );
  const slabCount = payload.rooms.reduce((total, room) => total + (room.slabs?.length ?? 0), 0);
  const totalNumberOfSlabs = payload.rooms.reduce(
    (total, room) =>
      total +
      (room.slabs ?? []).reduce((roomTotal, slab) => roomTotal + (Number(slab.number_of_slabs) || 0), 0),
    0,
  );
  const materialTypes = [
    ...new Set(
      payload.rooms.flatMap((room) =>
        (room.slabs ?? []).map((slab) => slab.material_type).filter(Boolean),
      ),
    ),
  ];
  const doorCount = payload.rooms.reduce((total, room) => total + (room.doors?.length ?? 0), 0);
  const hardwareTypes = [
    ...new Set(
      payload.rooms.flatMap((room) =>
        (room.doors ?? []).flatMap((door) =>
          (door.types ?? []).map((item) => (typeof item === "string" ? item : item.type)),
        ),
      ).filter(Boolean),
    ),
  ];
  const cabinetItemsFor = (key) => payload.rooms.flatMap((room) => room[key] ?? []);
  const knobs = cabinetItemsFor("knobs");
  const pulls = cabinetItemsFor("pulls");
  const ballCatches = cabinetItemsFor("ball_catches");
  const quantityTotal = (items) =>
    items.reduce((total, item) => total + (Number(item.quantity) || 0), 0);
  const cabinetFinishes = [
    ...new Set([...knobs, ...pulls, ...ballCatches].map((item) => item.finish).filter(Boolean)),
  ];
  const showerDoorTypes = [
    ...new Set(payload.rooms.map((room) => room.door?.door_type).filter(Boolean)),
  ];
  const showerGlassTypes = [
    ...new Set(payload.rooms.map((room) => room.glass_specs?.glass_type).filter(Boolean)),
  ];
  const showerGlassThicknesses = [
    ...new Set(payload.rooms.map((room) => room.glass_specs?.thickness).filter(Boolean)),
  ];
  const showerHardwareFinishes = [
    ...new Set(payload.rooms.map((room) => room.hardware?.finish).filter(Boolean)),
  ];
  const miscItems =
    payload.request_type === "miscellaneous"
      ? [
          ...(payload.rooms ?? []).flatMap((room) => room.items ?? []),
          ...(payload.exterior_items ?? []),
        ]
      : [];
  const miscTotalQuantity = quantityTotal(miscItems);
  const miscSuppliers = [...new Set(miscItems.map((item) => item.supplier).filter(Boolean))];

  return {
    roomCount: payload.rooms.length,
    lightCount,
    bulbCount,
    slabCount,
    totalNumberOfSlabs,
    materialTypes,
    doorCount,
    hardwareTypes,
    knobItemCount: knobs.length,
    pullItemCount: pulls.length,
    ballCatchItemCount: ballCatches.length,
    totalKnobQuantity: quantityTotal(knobs),
    totalPullQuantity: quantityTotal(pulls),
    totalBallCatchQuantity: quantityTotal(ballCatches),
    cabinetFinishes,
    showerDoorTypes,
    showerGlassTypes,
    showerGlassThicknesses,
    showerHardwareFinishes,
    miscItemCount: miscItems.length,
    miscTotalQuantity,
    miscSuppliers,
  };
}

function updatePreview() {
  jsonPreview.textContent = JSON.stringify(buildPayload(), null, 2);
}

function setStatus(type, message) {
  statusBox.className = `form-status is-visible is-${type}`;
  statusBox.textContent = message;
}

function clearStatus() {
  statusBox.className = "form-status";
  statusBox.textContent = "";
}

function focusFirstInvalidField() {
  const invalidField = form.querySelector(":invalid");
  if (!invalidField) return;
  invalidField.scrollIntoView({ behavior: "smooth", block: "center" });
  invalidField.focus({ preventScroll: true });
}

function formatSubmissionError(error) {
  if (error instanceof TypeError && /failed to fetch|networkerror|load failed/i.test(error.message)) {
    return [
      "Could not reach the Google Apps Script Web App.",
      "Confirm the deployment uses Execute as: Me, Who has access: Anyone, and that app.js uses the /exec URL from the active deployment.",
    ].join(" ");
  }

  return `Could not submit the request. ${error.message}`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function displayValue(value) {
  const text = String(value ?? "").trim();
  return text || "Not provided";
}

function booleanDisplay(value) {
  return value ? "Yes" : "No";
}

function typeLabel(type) {
  return String(type ?? "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function typeSummary(types) {
  return (types ?? [])
    .map((item) => {
      const type = typeof item === "string" ? item : item.type;
      const quantity = typeof item === "string" ? null : item.quantity;
      const name = typeof item === "string" ? "" : item.name;
      const finish = typeof item === "string" ? "" : item.finish;
      const details = [
        name ? `Name: ${name}` : "",
        finish ? `Finish: ${finish}` : "",
        quantity == null ? "" : `Qty: ${quantity}`,
      ].filter(Boolean);

      return details.length ? `${typeLabel(type)} (${details.join(", ")})` : typeLabel(type);
    })
    .join(", ");
}

function detailRow(label, value) {
  return `
    <div class="detail-label">${escapeHtml(label)}</div>
    <div class="detail-value">${escapeHtml(displayValue(value))}</div>
  `;
}

function detailLinkRow(label, value) {
  const text = String(value ?? "").trim();
  const content = text
    ? `<a href="${escapeHtml(text)}">${escapeHtml(text)}</a>`
    : "Not provided";

  return `
    <div class="detail-label">${escapeHtml(label)}</div>
    <div class="detail-value">${content}</div>
  `;
}

function renderDetailGrid(rows) {
  return `<div class="detail-grid">${rows.join("")}</div>`;
}

function renderItem(title, rows, extraContent = "") {
  return `
    <article class="print-item">
      <h4>${escapeHtml(title)}</h4>
      ${renderDetailGrid(rows)}
      ${extraContent}
    </article>
  `;
}

function renderEmptyItem(label) {
  return `<p class="empty-note">No ${escapeHtml(label)} added.</p>`;
}

function renderTiles(tiles) {
  if (!tiles.length) return renderEmptyItem("tiles");

  return tiles
    .map((tile, index) =>
      renderItem(`Tile ${index + 1}: ${displayValue(tile.item_name)}`, [
        detailRow("Sqft", tile.sqft),
        detailRow("Boxes ordered", tile.boxes_ordered),
        detailRow("Nominal dimensions", tile.nominal_dimensions),
        detailRow("Finish", tile.finish),
        detailRow("Color", tile.color),
        detailRow("Joint width", tile.joint_width),
        detailRow("Notes", tile.notes),
        detailRow("Details", tile.details),
        detailRow("Layout origin point", tile.layout.origin_point),
        detailRow("Layout direction", tile.layout.direction),
        detailRow("Transitions", tile.layout.transitions),
        detailRow("Layout area sqft", tile.layout.area_sqft),
      ]),
    )
    .join("");
}

function renderTrimItems(trimItems) {
  if (!trimItems.length) return renderEmptyItem("trim items");

  return trimItems
    .map((trim, index) =>
      renderItem(`Trim ${index + 1}: ${displayValue(trim.type)}`, [
        detailRow("Quantity", trim.quantity),
        detailRow("Notes", trim.notes),
      ]),
    )
    .join("");
}

function renderGroutItems(groutItems) {
  if (!groutItems.length) return renderEmptyItem("grout items");

  return groutItems
    .map((grout, index) =>
      renderItem(`Grout ${index + 1}: ${displayValue(grout.brand)}`, [
        detailRow("Color", grout.color),
        detailRow("Quantity", grout.quantity),
        detailRow("Notes", grout.notes),
      ]),
    )
    .join("");
}

function renderBulbs(bulbs) {
  if (!bulbs.length) return renderEmptyItem("bulbs");

  return bulbs
    .map((bulb, index) =>
      renderItem(`Bulb ${index + 1}`, [
        detailRow("Dimmable", booleanDisplay(bulb.dimmable)),
        detailRow("Kelvin", bulb.kelvin),
        detailRow("Watts", bulb.watts),
        detailRow("Quantity", bulb.quantity),
        detailRow("Finish", bulb.finish),
        detailRow("Shape", bulb.shape),
        detailRow("Mixed Metals Flag", booleanDisplay(bulb.mixed_metals_flag)),
        detailRow("Non-returnable", booleanDisplay(bulb.non_returnable)),
      ]),
    )
    .join("");
}

function renderLights(lights) {
  if (!lights.length) return renderEmptyItem("lights");

  return lights
    .map((light, index) =>
      renderItem(
        `Light ${index + 1}: ${displayValue(light.type)}`,
        [
          detailRow("Other light type", light.other_type),
          detailRow("Location type", light.location_type),
          detailRow("Quantity", light.quantity),
          detailRow("Rod Type", light.rod_type),
          detailRow("Blade", light.blade),
          detailRow("Size", light.size),
          detailRow("Finish", light.finish),
          detailRow("Hanging Height", light.hanging_height),
          detailRow("Diameter", light.diameter),
          detailRow("Glass Finish", light.glass_finish),
          detailRow("Shade Detail", light.shade_detail),
          detailRow("Finish body", light.finishes.body),
          detailRow("Finish socket", light.finishes.socket),
          detailRow("Finish cord / chain", light.finishes.cord_chain),
          detailRow("Accent hardware", light.finishes.accent_hardware),
          detailRow("Finish shade detail", light.finishes.shade_detail),
        ],
        `<h3>Bulbs</h3>${renderBulbs(light.bulbs)}`,
      ),
    )
    .join("");
}

function imageSummaryRows(label, image) {
  return [
    detailRow(`${label} image name`, image?.name),
    detailRow(`${label} image type`, image?.type),
    detailLinkRow(`${label} image URL`, image?.url),
  ];
}

function renderSlabs(slabs) {
  if (!slabs.length) return renderEmptyItem("slabs");

  return slabs
    .map((slab, index) =>
      renderItem(`Slab ${index + 1}: ${displayValue(slab.material_type)}`, [
        detailRow("Measurements of Slabs", slab.slab_measurements),
        detailRow("Number of Slabs", slab.number_of_slabs),
        detailRow("Edge details text", slab.edge_details.description),
        ...imageSummaryRows("Edge details", slab.edge_details.image),
        detailRow("Design description", slab.perimeter_island_design.description),
        ...imageSummaryRows("Design", slab.perimeter_island_design.image),
        detailRow("Backsplash description", slab.backsplash.description),
        ...imageSummaryRows("Backsplash", slab.backsplash.image),
        detailLinkRow("Link to Plumbing Hardware", slab.plumbing_hardware.url),
        detailRow("Plumbing Hardware quantity", slab.plumbing_hardware.quantity),
        detailLinkRow("Link to Sinks", slab.sinks.url),
        detailRow("Sinks quantity", slab.sinks.quantity),
        detailLinkRow("Link to Tub", slab.tub.url),
        detailRow("Tub quantity", slab.tub.quantity),
      ]),
    )
    .join("");
}

function renderDoors(doors) {
  if (!doors.length) return renderEmptyItem("doors");

  return doors
    .map((door, index) =>
      renderItem(`Door ${index + 1}: ${displayValue(door.door_name)}`, [
        detailRow("Backset Option", door.backset_option),
        detailRow("Back Plate Style", door.back_plate_style),
        detailRow("Door Thickness", door.door_thickness),
        detailRow("R or L Hand", door.door_hand),
        detailRow("Function", door.function),
        detailRow("Type", typeSummary(door.types)),
        detailRow("Key Instructions", door.key_instructions),
      ]),
    )
    .join("");
}

function renderCabinetHardwareItems(items, label) {
  if (!items.length) return renderEmptyItem(label.toLowerCase());

  const singularLabel = label === "Ball Catches" ? "Ball Catch" : label.slice(0, -1);

  return items
    .map((item, index) =>
      renderItem(`${singularLabel} ${index + 1}: ${displayValue(item.name)}`, [
        detailRow("Quantity", item.quantity),
        detailRow("Length", item.length),
        detailRow("Finish", item.finish),
      ]),
    )
    .join("");
}

function renderTileRoomSections(rooms) {
  return rooms
    .map(
      (room, index) => `
        <section class="print-room">
          <h2>Room ${index + 1}: ${escapeHtml(displayValue(room.room_name))}</h2>
          <h3>Tiles</h3>
          ${renderTiles(room.tiles)}
          <h3>Trim</h3>
          ${renderTrimItems(room.trim_items)}
          <h3>Grout</h3>
          ${renderGroutItems(room.grout_items)}
        </section>
      `,
    )
    .join("");
}

function renderLightRoomSections(rooms) {
  return rooms
    .map(
      (room, index) => `
        <section class="print-room">
          <h2>Room ${index + 1}: ${escapeHtml(displayValue(room.room_name))}</h2>
          <h3>Lights</h3>
          ${renderLights(room.lights)}
        </section>
      `,
    )
    .join("");
}

function renderCountertopRoomSections(rooms) {
  return rooms
    .map(
      (room, index) => `
        <section class="print-room">
          <h2>Room ${index + 1}: ${escapeHtml(displayValue(room.room_name))}</h2>
          <h3>Slabs</h3>
          ${renderSlabs(room.slabs)}
        </section>
      `,
    )
    .join("");
}

function renderDoorRoomSections(rooms) {
  return rooms
    .map(
      (room, index) => `
        <section class="print-room">
          <h2>Room ${index + 1}: ${escapeHtml(displayValue(room.room_name))}</h2>
          <h3>Doors</h3>
          ${renderDoors(room.doors)}
        </section>
      `,
    )
    .join("");
}

function renderCabinetRoomSections(rooms) {
  if (!rooms.length) return renderEmptyItem("cabinet hardware rooms");

  return rooms
    .map(
      (room, index) => `
        <section class="print-room">
          <h2>Room ${index + 1}: ${escapeHtml(displayValue(room.room_name))}</h2>
          <h3>Knobs</h3>
          ${renderCabinetHardwareItems(room.knobs, "Knobs")}
          <h3>Pulls</h3>
          ${renderCabinetHardwareItems(room.pulls, "Pulls")}
          <h3>Ball Catches</h3>
          ${renderCabinetHardwareItems(room.ball_catches, "Ball Catches")}
        </section>
      `,
    )
    .join("");
}

function renderShowerGlassRoomSections(rooms) {
  return rooms
    .map(
      (room, index) => `
        <section class="print-room">
          <h2>Room ${index + 1}: ${escapeHtml(displayValue(room.room_name))}</h2>
          ${renderItem("Shower Glass", [
            detailRow("Framing", room.framing),
            detailRow("Enclosure Layout", room.enclosure_layout),
            detailRow("Door Type", room.door.door_type),
            detailRow("Swing Direction", room.door.swing_direction),
            detailRow("Hinge Side", room.door.hinge_side),
            detailRow("Glass Thickness", room.glass_specs.thickness),
            detailRow("Glass Type", room.glass_specs.glass_type),
            detailRow("Other Glass Type", room.glass_specs.other_glass_type),
            detailRow("Hardware Finish", room.hardware.finish),
            detailRow("Hardware Style", room.hardware.style),
            detailRow("Notes", room.notes),
          ])}
        </section>
      `,
    )
    .join("");
}

function renderMiscItems(items, label) {
  if (!items.length) return renderEmptyItem(`${label.toLowerCase()}s`);

  return items
    .map((item, index) =>
      renderItem(`${label} ${index + 1}: ${displayValue(item.name)}`, [
        detailRow("Quantity", item.quantity),
        detailRow("Supplier", item.supplier),
        detailRow("Details", item.details),
      ]),
    )
    .join("");
}

function renderMiscRoomSections(rooms) {
  if (!rooms.length) return renderEmptyItem("rooms");

  return rooms
    .map(
      (room, index) => `
        <section class="print-room">
          <h2>Room ${index + 1}: ${escapeHtml(displayValue(room.room_name))}</h2>
          <h3>Items</h3>
          ${renderMiscItems(room.items ?? [], "Item")}
        </section>
      `,
    )
    .join("");
}

function renderMiscExteriorSections(items) {
  return renderMiscItems(items, "Exterior Item");
}

function buildPrintableHtml(payload) {
  const printedAt = new Date().toLocaleString();
  const counts = getPayloadCounts(payload);
  const requestTitle = requestTypes[payload.request_type]?.label ?? requestTypes.tile.label;
  const printBrand =
    payload.request_type === "light"
      ? "#f5c542"
      : payload.request_type === "countertop"
        ? "#0f9f9a"
        : payload.request_type === "door_hardware"
          ? "#d33f3f"
          : payload.request_type === "cabinet_hardware"
            ? "#d94892"
            : payload.request_type === "shower_glass"
              ? "#2563eb"
              : payload.request_type === "miscellaneous"
                ? "#166534"
                : payload.request_type === "site_super_request"
                  ? "#84cc16"
                  : "#f15a24";
  const roomSectionRenderers = {
    tile: renderTileRoomSections,
    light: renderLightRoomSections,
    countertop: renderCountertopRoomSections,
    door_hardware: renderDoorRoomSections,
    cabinet_hardware: renderCabinetRoomSections,
    shower_glass: renderShowerGlassRoomSections,
    miscellaneous: (rooms) =>
      payload.location_type === "exterior"
        ? renderMiscExteriorSections(payload.exterior_items ?? [])
        : renderMiscRoomSections(rooms),
    site_super_request: () => "",
  };
  const roomSections = (roomSectionRenderers[payload.request_type] ?? renderTileRoomSections)(payload.rooms);
  const countRowsByType = {
    tile: [detailRow("Room count", counts.roomCount)],
    light: [
      detailRow("Room count", counts.roomCount),
      detailRow("Light count", counts.lightCount),
      detailRow("Bulb count", counts.bulbCount),
    ],
    countertop: [
      detailRow("Room count", counts.roomCount),
      detailRow("Slab count", counts.slabCount),
      detailRow("Total number of slabs", counts.totalNumberOfSlabs),
      detailRow("Material types", counts.materialTypes.join(", ")),
    ],
    door_hardware: [
      detailRow("Room count", counts.roomCount),
      detailRow("Door count", counts.doorCount),
      detailRow("Hardware types", counts.hardwareTypes.join(", ")),
    ],
    cabinet_hardware: [
      detailRow("Room count", counts.roomCount),
      detailRow("Knob item count", counts.knobItemCount),
      detailRow("Pull item count", counts.pullItemCount),
      detailRow("Ball catch item count", counts.ballCatchItemCount),
      detailRow("Total knob quantity", counts.totalKnobQuantity),
      detailRow("Total pull quantity", counts.totalPullQuantity),
      detailRow("Total ball catch quantity", counts.totalBallCatchQuantity),
      detailRow("Finishes", counts.cabinetFinishes.join(", ")),
    ],
    shower_glass: [
      detailRow("Room count", counts.roomCount),
      detailRow("Door types", counts.showerDoorTypes.join(", ")),
      detailRow("Glass types", counts.showerGlassTypes.join(", ")),
      detailRow("Glass thicknesses", counts.showerGlassThicknesses.join(", ")),
      detailRow("Hardware finishes", counts.showerHardwareFinishes.join(", ")),
    ],
    miscellaneous: [
      detailRow("Location type", payload.location_type),
      detailRow("Item count", counts.miscItemCount),
      detailRow("Total quantity", counts.miscTotalQuantity),
      detailRow("Suppliers", counts.miscSuppliers.join(", ")),
    ],
    site_super_request: [],
  };
  const countRows = countRowsByType[payload.request_type] ?? countRowsByType.tile;
  const requestDetailRows =
    payload.request_type === "site_super_request"
      ? [
          detailRow("Date Submitted", payload.date_submitted),
          detailRow("Project", payload.project),
          detailRow("Task Name", payload.task_name),
          detailRow("Task Description", payload.task_description),
          detailRow("Date Requested", payload.date_requested),
          detailRow("Urgency", typeLabel(payload.urgency)),
        ]
      : [
          detailRow("Subject", payload.subject),
          detailRow("Project", payload.project),
          detailRow("Vendor", payload.vendor),
          detailRow("Date needed", payload.date_needed_to_be_paid),
          detailRow("Scope of work", payload.scope_of_work),
          detailLinkRow("Quote link", payload.quote_link),
          detailLinkRow("Drawings link", payload.drawings_link),
        ];

  if (payload.request_type === "door_hardware") {
    requestDetailRows.push(
      detailRow("Purchasing method", payload.purchasing_method),
      detailLinkRow("Door Hardware Quote Link", payload.door_hardware_quote_link),
      detailRow("Door Stops", payload.house_totals?.door_stops),
      detailRow("Hinge Stops", payload.house_totals?.hinge_stops),
      detailRow("Hinges", payload.house_totals?.hinges),
      detailRow("Front Door Notes", payload.front_door_notes),
    );
  }
  if (payload.request_type === "cabinet_hardware") {
    requestDetailRows.push(detailRow("Input method", payload.input_method));
  }
  if (payload.request_type === "shower_glass") {
    requestDetailRows.push(detailRow("Lead Time", payload.lead_time));
  }
  if (payload.request_type === "miscellaneous") {
    requestDetailRows.push(detailRow("Location type", payload.location_type));
  }

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(requestTitle)} - ${escapeHtml(displayValue(payload.project))}</title>
    <style>
      :root {
        --brand: ${printBrand};
        --ink: #1f1b18;
        --muted: #6f625b;
        --line: #d5c7bf;
        --surface: #ffffff;
        --soft: #fff0e8;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        color: var(--ink);
        background: var(--surface);
        font-family: Arial, Helvetica, sans-serif;
        font-size: 12px;
        line-height: 1.45;
      }

      .print-page {
        max-width: 8.1in;
        margin: 0 auto;
        padding: 0.35in;
      }

      header {
        display: flex;
        justify-content: space-between;
        gap: 24px;
        padding-bottom: 16px;
        border-bottom: 4px solid var(--brand);
      }

      .brand-mark {
        color: var(--brand);
        font-size: 22px;
        font-weight: 900;
        letter-spacing: 0.08em;
      }

      h1,
      h2,
      h3,
      h4,
      p {
        margin-top: 0;
      }

      h1 {
        margin-bottom: 6px;
        font-size: 24px;
        line-height: 1.1;
      }

      h2 {
        margin: 22px 0 10px;
        padding-bottom: 6px;
        border-bottom: 1px solid var(--line);
        font-size: 17px;
      }

      h3 {
        margin: 16px 0 8px;
        color: var(--brand);
        font-size: 13px;
        letter-spacing: 0.04em;
        text-transform: uppercase;
      }

      h4 {
        margin-bottom: 8px;
        font-size: 13px;
      }

      a {
        color: var(--ink);
        text-decoration: underline;
      }

      .meta {
        color: var(--muted);
        text-align: right;
      }

      .detail-grid {
        display: grid;
        grid-template-columns: 1.35in 1fr;
        border-top: 1px solid var(--line);
        border-left: 1px solid var(--line);
      }

      .detail-label,
      .detail-value {
        min-height: 26px;
        padding: 6px 8px;
        border-right: 1px solid var(--line);
        border-bottom: 1px solid var(--line);
      }

      .detail-label {
        color: var(--muted);
        background: #fff8f4;
        font-weight: 700;
      }

      .detail-value {
        overflow-wrap: anywhere;
      }

      .print-item {
        break-inside: avoid;
        margin-bottom: 12px;
        padding: 12px;
        border: 1px solid var(--line);
        border-radius: 8px;
      }

      .empty-note {
        margin: 0 0 12px;
        color: var(--muted);
      }

      @page {
        margin: 0.4in;
      }

      @media print {
        .print-page {
          max-width: none;
          padding: 0;
        }
      }
    </style>
  </head>
  <body>
    <main class="print-page">
      <header>
        <div>
          <div class="brand-mark">TRC</div>
          <h1>${escapeHtml(requestTitle)}</h1>
          <p>${escapeHtml(displayValue(payload.subject))}</p>
        </div>
        <div class="meta">
          <div>Generated ${escapeHtml(printedAt)}</div>
          <div>${escapeHtml(displayValue(payload.project))}</div>
        </div>
      </header>

      <section>
        <h2>Request details</h2>
        ${renderDetailGrid([...requestDetailRows, ...countRows])}
      </section>

      ${roomSections}
    </main>
    <script>
      window.addEventListener("load", () => {
        window.setTimeout(() => window.print(), 150);
      });
    </script>
  </body>
</html>`;
}

function printRequest() {
  clearStatus();
  form.classList.add("was-validated");

  if (!form.checkValidity()) {
    setStatus("error", "Please complete the highlighted required fields before printing the request.");
    focusFirstInvalidField();
    return;
  }

  const payload = buildPayload();
  jsonPreview.textContent = JSON.stringify(payload, null, 2);

  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    setStatus("error", "The browser blocked the print window. Allow pop-ups for this page, then try again.");
    return;
  }

  printWindow.document.open();
  printWindow.document.write(buildPrintableHtml(payload));
  printWindow.document.close();
  setStatus("success", "Printable request opened. Choose Save as PDF in the print dialog to create a text-selectable PDF.");
}

async function submitRequest(event) {
  event.preventDefault();
  clearStatus();
  form.classList.add("was-validated");

  if (!form.checkValidity()) {
    setStatus("error", "Please complete the highlighted required fields and correct any invalid links.");
    focusFirstInvalidField();
    return;
  }

  const payload = buildPayload();
  payload.submitted_at = new Date().toISOString();
  jsonPreview.textContent = JSON.stringify(payload, null, 2);

  if (!GOOGLE_APPS_SCRIPT_URL) {
    console.info(`${requestTypes[payload.request_type].label} (local preview):`, payload);
    setStatus("success", "Local validation passed. The complete request JSON was logged to the browser console.");
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = "Submitting...";

  try {
    const response = await fetch(GOOGLE_APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
      redirect: "follow",
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok || result.ok === false) {
      throw new Error(result.error || `Submission failed with status ${response.status}.`);
    }

    setStatus("success", `Request submitted to Google Sheets${result.row ? ` in row ${result.row}` : ""}.`);
  } catch (error) {
    console.error("Submission error:", error);
    setStatus("error", formatSubmissionError(error));
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Submit request";
  }
}

roomsContainer.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const action = button.dataset.action;
  const room = button.closest("[data-room]");

  if (action === "add-tile") addTile(room);
  if (action === "add-trim") addTrim(room);
  if (action === "add-grout") addGrout(room);
  if (action === "add-light") addLight(room);
  if (action === "add-bulb") addBulb(button.closest('[data-item="light"]'));
  if (action === "add-slab") addSlab(room);
  if (action === "add-door") addDoor(room);
  if (action === "add-knob") addCabinetHardwareItem(room, "knob");
  if (action === "add-pull") addCabinetHardwareItem(room, "pull");
  if (action === "add-ball-catch") addCabinetHardwareItem(room, "ball-catch");
  if (action === "add-misc-item") addMiscItem(room);
  if (action === "clear-image") {
    clearImageGroup(button.closest("[data-image-group]"));
    updatePreview();
  }

  if (action === "remove-item") {
    const item = button.closest("[data-item]");
    const type = item.dataset.item;
    const parentLight = button.closest('[data-item="light"]');

    revokeImagePreviews(item);
    item.remove();

    if (type === "bulb") {
      renumberBulbs(parentLight);
    } else {
      renumberItems(room, type);
    }

    updatePreview();
  }

  if (action === "remove-room") {
    revokeImagePreviews(room);
    room.remove();
    renumberAll();
    updatePreview();
  }
});

miscExteriorSection.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const action = button.dataset.action;

  if (action === "add-exterior-item") {
    addMiscExteriorItem();
  }

  if (action === "remove-item") {
    const item = button.closest('[data-item="exterior-item"]');
    item.remove();
    renumberItems(miscExteriorContainer, "exterior-item");
    updatePreview();
  }
});

form.addEventListener("input", () => {
  clearStatus();
  updatePreview();
});

form.addEventListener("change", (event) => {
  if (event.target === requestTypeInput) {
    applyRequestTypeCopy();
    resetRoomsForRequestType();
    return;
  }

  if (event.target.matches("[data-image-input]")) {
    handleImageSelection(event.target);
    return;
  }

  if (event.target.matches('input[name="door_purchasing_method"]')) {
    syncDoorMethodPanels();
  }

  if (event.target.matches('input[name="cabinet_input_method"]')) {
    syncRoomsSectionVisibility();
  }

  if (event.target.matches('input[name="misc_location_type"]')) {
    syncRoomsSectionVisibility();
    if (
      radioValue("misc_location_type") === "exterior" &&
      !miscExteriorContainer.querySelector('[data-item="exterior-item"]')
    ) {
      addMiscExteriorItem();
    }
  }

  const door = event.target.closest('[data-item="door"]');
  if (door && event.target.matches("[data-type-value]")) {
    syncDoorTypeQuantities(door);
  }

  const showerRoom = event.target.closest('[data-room]');
  if (
    getRequestType() === "shower_glass" &&
    showerRoom &&
    event.target.matches("[data-door-config-field], [data-glass-field]")
  ) {
    syncShowerGlassConditionalFields(showerRoom);
  }

  const light = event.target.closest('[data-item="light"]');
  if (light && event.target.matches('[data-field="type"]')) {
    syncLightConditionalFields(light);
  }

  updatePreview();
});

form.addEventListener("submit", submitRequest);

document.querySelector('[data-action="add-room"]').addEventListener("click", addRoom);
printButton.addEventListener("click", printRequest);

document.querySelector("#copy-json").addEventListener("click", async (event) => {
  try {
    await navigator.clipboard.writeText(jsonPreview.textContent);
    const button = event.currentTarget;
    const originalText = button.textContent;
    button.textContent = "Copied";
    window.setTimeout(() => {
      button.textContent = originalText;
    }, 1400);
  } catch {
    setStatus("error", "The browser could not copy automatically. Select the JSON preview and copy it manually.");
  }
});

if (GOOGLE_APPS_SCRIPT_URL) {
  modeBadge.textContent = "Google Sheets URL configured";
  submitHelper.textContent = "The request will be validated and sent to the configured Google Apps Script Web App.";
}

applyRequestTypeCopy();
resetRoomsForRequestType();
