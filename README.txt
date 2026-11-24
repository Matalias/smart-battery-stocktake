SMART BATTERY PHYSICAL STOCKTAKE & REPORTING SYSTEM
BIT2044 Web Technologies | Academic prototype

HOW TO RUN
1. Extract the ZIP.
2. Open index.html in Chrome, Edge, or Firefox.
3. Navigate to Import Stock and import an authorized current Live Stock CSV or Excel file.
4. Go to Stock Verification, enter a date, checker and verifier names, and ALL physical counts.
5. Choose Remarks, enter defective quantities/notes if applicable, then Save after the final review.
6. Open Stocktake Report and download the genuine Excel (.xlsx) report. Open the workbook, recheck, save, then attach it to your email manually.

IMPORT LIMITATIONS
- CSV import works offline. Excel .xlsx export requires SheetJS to load from the internet.
- XLSX/XLS import uses SheetJS from cdn.sheetjs.com and requires an internet connection when the library is loaded. If unavailable, export the Live Stock report as CSV.
- Expected columns: SKU, Product Name, Brand, Live Stock. Alternative common headings supported.
- The first worksheet is read for Excel files.
- The importer does not support merged-cell report layouts or multiple tables without reformatting.
- Use a unique SKU per row.

DATA / PRIVACY
- All imported reference data and stocktake sessions are stored in this browser via localStorage.
- No upload to a server and no connection to company Live Stock.
- Avoid importing confidential company data without permission.
- LocalStorage is browser/device specific and can be cleared; export reports regularly.
- This is a prototype, not a production inventory management system.

FINAL REPORT
- The Stocktake Report page exports a real .xlsx file with Stocktake Report and Summary sheets.
- Export does not email automatically. Users must recheck, save and email the file manually.
- Saving a final stocktake requires all product counts and verifier details.
- Workbook styling is minimal; Tally and Not Tally are explicit text values.

STATUS LOGIC
- Tally means physical count equals imported Live Stock.
- Not Tally means quantities differ.
- Defective is recorded separately and may occur even when counts tally.
- Remarks are selected by the user and are not proof of a confirmed loss.

UAT V2.1.1: No bundled sample data. Previous built-in demo reference and draft are cleared; demo sessions are excluded. Existing genuine saved sessions remain.


STOCK COUNT CALCULATOR (UPDATE)
- In Stock Verification, select Calculate beside a product.
- Enter confirmed UNIT quantities for Rack, Floor and Unopened Stock.
- Use 0 when there are no units in a category. Do not enter package counts.
- Choose "Unopened stock quantity unknown (Pending Count)" if quantities
  are unverified. A pending count blocks final session save.
- Apply Total to transfer the sum to Physical Count automatically.
- Excel export includes Rack, Floor and Unopened Units where calculator was used.
- Manually entering Physical Count remains supported; category fields are cleared.
- Do not count the same battery in more than one category.

AUTOSAVE FIX
- Physical counts, calculator totals, remarks and checker fields are saved automatically as a temporary draft in this browser.
- Returning to Stock Verification restores the unfinished draft if the reference stock list is unchanged.
- Stocktake Report only lists completed sessions after Save stocktake session.
- Final session requires all product quantities, a date and Stock Check By; Verify By is optional.
- Clear counts removes the temporary draft after confirmation.
- Importing a different reference invalidates the previous draft; finish/export first.
- Browser storage is not a permanent backup; download the final Excel report.

REPORT PAGE FIX
- Unfinished draft counts are now visible on Stocktake Report.
- Draft preview is NOT a finalized report and cannot be exported as final.
- Complete every product and enter Date + Stock Check By.
- Click Save stocktake session; successful save opens Stocktake Report automatically.
- Saved sessions appear under Saved sessions; click Download Excel.
- Use the same browser and the same extracted folder while testing.


IMPORTANT: SINGLE-FILE NAVIGATION FIX
Open ONLY index.html. All five screens are available via the sidebar in this one file.
Do not open catalogue.html, import.html, verification.html or report.html:
these are now logical screens in index.html, to keep browser storage shared.
Import the Live Stock file again in this version (previous file:// page-specific
localStorage may not be accessible from this new entry point).
After import, Stock Verification must show the same product count and source.
Always keep the folder together; do not move index.html away from assets.

IMPORT VALIDATION UPDATE: Only .csv, .xlsx and .xls accepted. Empty files and files over 10 MB rejected. Excel requires SheetJS CDN connectivity. This is a browser prototype; test with simulated stock data.

V2 prototype: Master Excel export. Open index.html with internet access. Import stock, count all products, save session, choose completed session in Stocktake Report, select authorized master XLSX and reference worksheet, enter Pitstop, export. Use a test date not already present in master. Original workbook is not overwritten. Current template limit: 91 products. Existing worksheet XML parts are not rewritten; workbook metadata and calculation chain are updated. Printer settings of new sheet may differ. Browser export has not been end-to-end tested. Do not use operationally until verified in Microsoft Excel. Third-party scripts load from CDNs; obtain authorization before importing real company data. No real company files included in ZIP.
