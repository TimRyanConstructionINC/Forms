# Tile Procurement Request

A dependency-free browser form for collecting tile procurement requests with repeatable rooms, tiles, trim, grout, and tile layout details.

## Files

- `index.html` - hosted browser entry point that redirects to the form
- `FORM.html` - editable source copy of the form structure and reusable item templates
- `styles.css` - responsive procurement-focused interface
- `app.js` - add/remove behavior, validation, nested JSON preview, and submission
- `google-apps-script.js` - Google Apps Script Web App endpoint that appends one row per request

The repository root also includes an `index.html` redirect so a GitHub Pages site can open the online interface from the site root.

## Run locally

The form works without a server. Open `TILE/index.html` in a browser, or serve the folder locally for a normal HTTP origin:

```powershell
python -m http.server 8000
```

Then open `http://localhost:8000/`.

## Publish with GitHub Pages

1. Push the repository to GitHub.
2. Open the repository settings, then **Pages**.
3. Set the source to deploy from the branch that contains this folder.
4. Leave the folder set to the repository root.
5. Open the Pages URL after GitHub finishes publishing. The root page redirects to `TILE/`, and `TILE/index.html` redirects to `FORM.html`.

The initial request contains one room and one tile. Add or remove rooms, tiles, trim, and grout with their labeled controls. The JSON preview updates whenever a field or item changes.

With `GOOGLE_APPS_SCRIPT_URL` left blank in `app.js`, **Submit request** validates the form, updates the preview with `submitted_at`, and logs the complete JSON payload to the browser console. No network request is made.

Use **Print PDF** to create a clean printable version of the current request. The button opens a text-based report in a new tab and starts the browser print dialog; choose **Save as PDF** to export a PDF with selectable, copyable text.

## JSON shape

The browser sends one object. The repeatable sections remain nested:

```json
{
  "schema_version": 1,
  "subject": "Lobby tile order",
  "date_needed_to_be_paid": "2026-08-01",
  "project": "Project 101",
  "vendor": "Example Tile Supply",
  "quote_link": "https://example.com/quote",
  "scope_of_work": "Intermediate",
  "drawings_link": "https://example.com/drawings",
  "submitted_at": "2026-07-20T12:00:00.000Z",
  "rooms": [
    {
      "id": "room-…",
      "room_name": "Main lobby",
      "tiles": [
        {
          "id": "tile-…",
          "sqft": 850,
          "boxes_ordered": 42,
          "item_name": "12x24 Porcelain - Sand",
          "nominal_dimensions": "12 x 24",
          "finish": "Matte",
          "color": "Sand",
          "joint_width": "1/8 in",
          "notes": "",
          "details": "",
          "layout": {
            "origin_point": "Centerline at main doors",
            "direction": "North to south",
            "transitions": "Schluter at elevator",
            "area_sqft": 825
          }
        }
      ],
      "trim_items": [],
      "grout_items": []
    }
  ]
}
```

Blank numbers are represented as `null`; entered numbers are serialized as JSON numbers.

## Connect Google Sheets

1. Create or choose a Google Sheet. Copy the spreadsheet ID from the URL: the text between `/d/` and `/edit`.
2. In the Sheet, open **Extensions -> Apps Script**.
3. Replace the editor contents with `google-apps-script.js` from this folder.
4. Replace `PASTE_SPREADSHEET_ID_HERE` with the spreadsheet ID. Change `SHEET_NAME` if desired.
5. Click **Deploy -> New deployment** and choose **Web app**.
6. Set **Execute as** to **Me**. For this static browser form, set **Who has access** to **Anyone**. Domain-only or owner-only deployments can show **Google Sheets URL configured** in the form but still fail during submit with `Failed to fetch` because the browser POST is treated as unauthenticated.
7. Authorize the script, deploy it, and copy its `/exec` Web App URL.
8. In `app.js`, set:

   ```js
   const GOOGLE_APPS_SCRIPT_URL = "https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec";
   ```

9. Reload the form. The top badge should read **Google Sheets URL configured**. Submit a test request and confirm that one row appears.

The Apps Script creates the `Tile Procurement Requests` tab if it does not exist, freezes and formats the header, and writes these columns:

| received_at | subject | project | vendor | date_needed_to_be_paid | quote_link | scope_of_work | drawings_link | room_count | payload_json |
| --- | --- | --- | --- | --- | --- | --- | --- | ---: | --- |

`payload_json` contains the full request exactly as submitted. A script lock prevents simultaneous submissions from colliding, and flat text values are protected from accidental spreadsheet-formula interpretation.

## Apps Script updates

After changing `google-apps-script.js`, create a new Web App version from **Deploy -> Manage deployments -> Edit -> New version -> Deploy**. The deployment URL normally remains the same.

If the browser reports a submission error, open the Apps Script project's **Executions** page for the server-side error and confirm that the deployed version contains the correct spreadsheet ID. If the browser says `Failed to fetch`, first check the Web App deployment access: for this static page it needs **Execute as: Me** and **Who has access: Anyone**, using the active `/exec` deployment URL.
