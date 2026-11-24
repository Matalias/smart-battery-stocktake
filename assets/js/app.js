"use strict";
const KEY_REF="sb_stock_reference_v1",KEY_SESS="sb_stock_sessions_v1",KEY_DRAFT="sb_stock_draft_v1";
const $=id=>document.getElementById(id);const get=(key,defaultValue)=>{try{const v=JSON.parse(localStorage.getItem(key));return v??defaultValue}catch{return defaultValue}};const put=(key,value)=>localStorage.setItem(key,JSON.stringify(value));const ref=()=>get(KEY_REF,null)||{source:"No Live Stock imported",importedAt:null,items:[]};const sessions=()=>get(KEY_SESS,[]).filter(s=>s.source!=="Sample data (demonstration)");const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));const isCount=v=>v!==""&&v!==null&&v!==undefined&&Number.isInteger(Number(v))&&Number(v)>=0;const status=(live,physical)=>!isCount(physical)?"Pending":Number(physical)===Number(live)?"Tally":"Not Tally";const pill=s=>`<span class="status ${s.toLowerCase().replaceAll(" ","-")}">${esc(s)}</span>`;
function message(id,text,error=false){if($(id))$(id).innerHTML=`<div class="notice ${error?'error':''}">${esc(text)}</div>`}
function ensureRef(){const r=ref();if(r && r.source==="Sample data (demonstration)"){localStorage.removeItem(KEY_REF);localStorage.removeItem(KEY_DRAFT);} }
function renderDashboard(){const r=ref(),s=sessions(),last=s[0],items=last?.items||[];const tally=items.filter(x=>status(x.live,x.physical)==="Tally").length;const mismatch=items.filter(x=>status(x.live,x.physical)==="Not Tally").length;const stats=[["Reference products",r.items.length],["Saved sessions",s.length],["Last session: Tally",tally],["Last session: Not Tally",mismatch]];$("dashboardStats").innerHTML=stats.map(x=>`<div class="stat"><div class="label">${esc(x[0])}</div><div class="value">${x[1]}</div></div>`).join("");$("dashboardRecent").innerHTML=last?`<p>Last saved: <strong>${esc(last.date)}</strong> · Checked by ${esc(last.checker)} · ${last.items.length} products</p><a href="index.html?page=report.html" class="btn secondary">View reports</a>`:'<p>No stocktake session saved yet. Start by importing stock and entering physical counts.</p><a class="btn" href="index.html?page=verification.html">Start stocktake</a>'}
function renderCatalogue(){const items=ref().items,search=($("catalogueSearch")?.value||"").toLowerCase();const found=items.filter(x=>(x.sku+" "+x.name+" "+x.brand).toLowerCase().includes(search));$("catalogueCount").textContent=`${found.length} products`;$("catalogueRows").innerHTML=found.map(x=>`<tr><td><strong>${esc(x.name)}</strong><small>${esc(x.sku)}</small></td><td>${esc(x.brand)}</td><td>${x.live}</td></tr>`).join("")||'<tr><td colspan="3">No matching products.</td></tr>'}
function parseCSV(text){const rows=[];let row=[],value="",quoted=false;for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){value+='"';i++}else quoted=!quoted}else if(c===','&&!quoted){row.push(value);value=""}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(value);if(row.some(x=>x.trim()))rows.push(row);row=[];value=""}else value+=c}row.push(value);if(row.some(x=>x.trim()))rows.push(row);if(quoted)throw Error("Unclosed quoted value in CSV file.");return rows}
function normalizeRows(rows){
 if(!rows.length)throw Error("The file contains no rows.");
 // Some spreadsheet CSV exports prepend an Excel delimiter declaration, e.g. sep=,
 const data=rows.filter(row=>row.some(v=>String(v??"").trim()));
 if(data.length && /^(?:\uFEFF)?sep\s*=/i.test(String(data[0][0]??"").trim()))data.shift();
 if(!data.length)throw Error("The file contains no column headings.");
 const headers=data[0].map(x=>String(x??"").trim().toLowerCase().replace(/[^a-z0-9]/g,""));
 const col=names=>headers.findIndex(h=>names.includes(h));
 const ixName=col(["productname","product","description","itemname","batteryname","model"]);
 const ixSku=col(["sku","productcode","itemcode","code"]);
 const ixSize=col(["batterysize","size"]);
 const ixBrand=col(["brand","make"]);
 let ixLive=col(["livestock","stock","quantity","qty","onhand","stockqty","balance"]);
 // Live Stock pivot exports name the quantity column after the location.
 // Only accept a known location header, or a single remaining quantity column.
 if(ixLive<0)ixLive=col(["hqmatangkuching"]);
 if(ixLive<0&&ixName>=0){
   const excluded=new Set([ixName,ixSku,ixSize,ixBrand].filter(i=>i>=0));
   const remaining=headers.map((_,i)=>i).filter(i=>!excluded.has(i));
   if(remaining.length===1 && confirm(`Use column ${data[0][remaining[0]]} as Live Stock quantity?`))ixLive=remaining[0];
 }
 if(ixName<0||ixLive<0)throw Error("Could not identify Product Name and Live Stock columns. Check the CSV headings.");
 const seen=new Set(),items=[];
 for(const [i,row] of data.slice(1).entries()){
   const name=String(row[ixName]??"").trim();if(!name){if(row.some(v=>String(v??"").trim()))throw Error(`Missing product name at row ${i+2}`);continue;}
   const brand=String(ixBrand>=0?row[ixBrand]??"":"").trim()||"Unspecified";
   const size=String(ixSize>=0?row[ixSize]??"":"").trim();
   // A battery size alone is not unique across brands. Preserve both fields.
   const sku=String(ixSku>=0?row[ixSku]??"":"").trim()||
     `${brand}-${name}`;
   const raw=String(row[ixLive]??"").trim();
   if(!/^\d+$/.test(raw))throw Error(`Invalid Live Stock at row ${i+2}: ${raw||'(blank)'}. Use non-negative whole numbers.`);
   if(seen.has(sku))throw Error(`Duplicate SKU ${sku}. Please ensure every row has a unique SKU.`);
   seen.add(sku);items.push({sku,name,brand,live:Number(raw)});
 }
 if(!items.length)throw Error("No valid product rows found.");
 return items;
}
function renderImport(){const r=ref();if(!r.items.length){$("referenceInfo").textContent="No Live Stock imported. Import the latest file to begin.";$("importPreview").innerHTML="";return;}$("referenceInfo").textContent=`${r.items.length} products · Source: ${r.source} · Imported: ${new Date(r.importedAt).toLocaleString()}`;$("importPreview").innerHTML=r.items.map(x=>`<tr><td>${esc(x.sku)}</td><td>${esc(x.name)}</td><td>${esc(x.brand)}</td><td>${x.live}</td></tr>`).join("");}
async function doImport(){const file=$("stockFile").files[0];if(!file)return message("importMessage","Choose a CSV or Excel file first.",true);try{
 const extension=(file.name.match(/\.([^.]+)$/)||[])[1]?.toLowerCase();
 if(!["csv","xlsx","xls"].includes(extension))throw Error("Unsupported file type. Only CSV (.csv) and Excel (.xlsx, .xls) are allowed.");
 if(file.size===0)throw Error("The selected file is empty.");
 if(file.size>10*1024*1024)throw Error("File is too large. Maximum allowed size is 10 MB.");
 let rows;if(/\.csv$/i.test(file.name)){rows=parseCSV((await file.text()).replace(/^\uFEFF/,""))}else if(/\.(xlsx|xls)$/i.test(file.name)){if(!window.XLSX)throw Error("Excel reader unavailable. Connect to the internet to load the Excel reader, or export the file as CSV and import it offline.");const wb=window.XLSX.read(await file.arrayBuffer(),{type:"array"});if(!wb.SheetNames.length)throw Error("Excel workbook has no worksheets.");rows=window.XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{header:1,defval:""})}else throw Error("Please select a .xlsx, .xls or .csv file.");const items=normalizeRows(rows);if(!confirm(`Import ${items.length} products from ${file.name}? This replaces the current reference list. Any unsent counts for a different product list will not be carried over. Saved reports remain available.`))return;put(KEY_REF,{source:file.name,importedAt:new Date().toISOString(),items});renderImport();message("importMessage",`Imported ${items.length} products successfully. Open Stock Verification to count the same imported products.`)}catch(e){message("importMessage",e.message,true)}}
let draft=[];let activeCalcIndex=null;
function draftSignature(){return JSON.stringify(ref().items.map(x=>[x.sku,x.name,x.live]));}
function saveDraft(){try{put(KEY_DRAFT,{signature:draftSignature(),items:draft,date:$("sessionDate").value,checker:$("checker").value,verifier:$("verifier").value});}catch(e){message("verifyMessage","Could not save temporary progress. Check browser storage.",true)}}
function resetDraft(){localStorage.removeItem(KEY_DRAFT);initVerification(true)}
function initVerification(fresh=false){
 const old=fresh?null:get(KEY_DRAFT,null);
 const restore=old&&old.signature===draftSignature()&&Array.isArray(old.items)&&old.items.length===ref().items.length;
 draft=restore?old.items:ref().items.map(x=>({...x,physical:"",rack:"",floor:"",unopened:"",pending:false,defective:"0",remark:"",note:""}));
 $("sessionDate").value=restore?old.date||new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,10):new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,10);
 $("checker").value=restore?old.checker||"":"";$("verifier").value=restore?old.verifier||"":"";
 renderVerification();if(!ref().items.length)message("verifyMessage","Import the latest Live Stock file before counting.",true);if(restore)message("verifyMessage","Previous unsent counts restored automatically. Continue counting, then save the completed session.");
}
function renderVerification(){$("verificationSource").textContent=`Current source: ${ref().source} · ${ref().items.length} imported products`;const search=($("verifySearch")?.value||"").toLowerCase(),shown=draft.map((x,i)=>({...x,index:i})).filter(x=>(x.sku+" "+x.name+" "+x.brand).toLowerCase().includes(search));$("verifyCount").textContent=`${shown.length} / ${draft.length} products`;$("verificationRows").innerHTML=shown.map(x=>{const s=status(x.live,x.physical),diff=isCount(x.physical)?Number(x.physical)-x.live:null;return `<tr data-index="${x.index}"><td><strong>${esc(x.name)}</strong><small>${esc(x.sku)}</small></td><td>${x.live}</td><td><input aria-label="Physical count ${esc(x.name)}" data-field="physical" type="number" min="0" step="1" value="${esc(x.physical)}" inputmode="numeric" placeholder="Count"></td><td><button class="btn small secondary" type="button" data-calc="${x.index}">Calculate</button></td><td class="diff">${diff===null?'—':diff>0?'+'+diff:diff}</td><td class="status-cell">${pill(s)}</td><td><input aria-label="Defective quantity ${esc(x.name)}" data-field="defective" type="number" min="0" step="1" value="${esc(x.defective)}"></td><td><select aria-label="Remarks ${esc(x.name)}" data-field="remark">${["","Shortage","Excess","Defective","Other"].map(v=>`<option value="${v}" ${x.remark===v?'selected':''}>${v||"(Blank)"}</option>`).join("")}</select></td><td><input aria-label="Additional notes ${esc(x.name)}" data-field="note" maxlength="250" value="${esc(x.note)}" placeholder="Optional note"></td></tr>`}).join("")||'<tr><td colspan="9">No matching products.</td></tr>'}
function updateRow(event){const target=event.target,field=target.dataset.field;if(!field)return;const tr=target.closest("tr"),index=Number(tr.dataset.index),x=draft[index];x[field]=target.value;if(field==="physical"){x.pending=false;x.rack="";x.floor="";x.unopened=""}if(field==="physical"){const s=status(x.live,x.physical),diff=isCount(x.physical)?Number(x.physical)-x.live:null;tr.querySelector(".diff").textContent=diff===null?'—':diff>0?'+'+diff:diff;tr.querySelector(".status-cell").innerHTML=pill(s)}saveDraft()}

function openCalculator(index){
 activeCalcIndex=index;
 const x=draft[index];if(!x)return;
 $("calcProduct").innerHTML=`<strong>${esc(x.name)}</strong> · Live Stock: ${x.live}`;
 for(const [field,id] of [["rack","calcRack"],["floor","calcFloor"],["unopened","calcUnopened"]])$(id).value=x[field]??"";
 $("calcPending").checked=!!x.pending;
 $("countCalculator").classList.add("open");
 $("applyCalculator").disabled=false;
 updateCalculator();
 $("countCalculator").scrollIntoView({behavior:"smooth",block:"start"});
}
function updateCalculator(){
 const pending=$("calcPending").checked;
 $("calcUnopened").disabled=pending;
 const values=[$("calcRack").value,$("calcFloor").value,$("calcUnopened").value];
 const valid=values.slice(0,2).every(isCount)&&(pending||isCount(values[2]));
 $("calcTotal").textContent=pending?"Pending":valid?values.reduce((n,v,i)=>n+(i===2&&pending?0:Number(v)),0):"–";
 $("applyCalculator").disabled=activeCalcIndex===null||!valid||pending;
 message("calcMessage",pending?"Unopened stock is not verified. Physical Count remains Pending until it is confirmed.":valid?"Ready to apply confirmed total.":"Enter whole-number counts for Rack, Floor and Unopened Stock (use 0 if none).",pending);
}
function applyCalculator(){
 if(activeCalcIndex===null||$("calcPending").checked)return;
 const values=[$("calcRack").value,$("calcFloor").value,$("calcUnopened").value];
 if(!values.every(isCount))return;
 const x=draft[activeCalcIndex];
 [x.rack,x.floor,x.unopened]=values;
 x.pending=false;x.physical=String(values.reduce((sum,v)=>sum+Number(v),0));
 saveDraft();renderVerification();
 message("verifyMessage",`Calculated ${x.physical} confirmed units for ${x.name}.`);
 $("countCalculator").classList.remove("open");
 activeCalcIndex=null;
}
function saveSession(){if(!ref().items.length)return message("verifyMessage","Import the latest Live Stock file before saving.",true);if(draft.length!==ref().items.length)return message("verifyMessage","Reference and count list mismatch. Reload Stock Verification before saving.",true);const date=$("sessionDate").value,checker=$("checker").value.trim(),verifier=$("verifier").value.trim();if(!date||!checker)return message("verifyMessage","Date and Stock Check By are required for final review.",true);if(draft.some(x=>x.pending))return message("verifyMessage","Unopened stock remains Pending Count. Confirm every package quantity before final review.",true);const counted=draft.filter(x=>x.physical!=="");if(counted.length!==draft.length)return message("verifyMessage",`Complete all physical counts before final review (${counted.length}/${draft.length} entered).`,true);for(const x of draft){if(x.physical!==""&&!isCount(x.physical))return message("verifyMessage",`Invalid physical count for ${x.name}.`,true);if(!isCount(x.defective)||Number(x.defective)>Number(x.physical||0))return message("verifyMessage",`Invalid defective quantity for ${x.name}.`,true);if(x.physical!==""){const diff=Number(x.physical)-x.live;if(diff<0&&x.remark==="Excess"||diff>0&&x.remark==="Shortage")return message("verifyMessage",`Remarks contradict stock difference for ${x.name}.`,true)}}const entry={id:Date.now().toString(36)+Math.random().toString(36).slice(2,7),date,checker,verifier,createdAt:new Date().toISOString(),source:ref().source,items:counted.map(x=>({...x,physical:Number(x.physical),defective:Number(x.defective)}))};put(KEY_SESS,[entry,...sessions()]);localStorage.removeItem(KEY_DRAFT);message("verifyMessage",`Saved ${counted.length} counted products. Opening Stocktake Report...`);window.location.href="index.html?page=report.html"}
function renderDraftReport(){
 const d=get(KEY_DRAFT,null),el=$("draftReport");if(!el)return;
 if(!d||!Array.isArray(d.items)||!d.items.length){el.innerHTML='<p>No unfinished stocktake draft on this browser.</p>';return;}
 const completed=d.items.filter(x=>!x.pending&&isCount(x.physical)).length,pending=d.items.filter(x=>x.pending).length;
 el.innerHTML=`<p><strong>Unfinished stocktake: ${completed}/${d.items.length} products counted.</strong> ${pending?`${pending} pending unopened-stock checks.`:""}</p><p>This is an automatically saved draft, not a final report. You can review it here and continue counting without losing progress.</p><a class="btn" href="index.html?page=verification.html">Continue / Finalize Stocktake</a><div class="table-wrap"><table><thead><tr><th>Product</th><th>Live</th><th>Physical</th><th>Status</th></tr></thead><tbody>${d.items.map(x=>`<tr><td>${esc(x.name)}</td><td>${x.live}</td><td>${isCount(x.physical)?x.physical:"Not counted"}</td><td>${pill(x.pending?"Pending":status(x.live,x.physical))}</td></tr>`).join("")}</tbody></table></div>`;
}
function renderReports(){renderDraftReport();const list=sessions();$("reportCount").textContent=`${list.length} sessions`;$("reportRows").innerHTML=list.map(x=>{const t=x.items.filter(i=>status(i.live,i.physical)==="Tally").length;return `<tr><td>${esc(x.date)}</td><td>${esc(x.checker)}</td><td>${esc(x.verifier||"—")}</td><td>${x.items.length}</td><td>${t}</td><td>${x.items.length-t}</td><td><button class="btn small secondary" data-action="view" data-id="${esc(x.id)}">View</button> <button class="btn small" data-action="export" data-id="${esc(x.id)}">Download Excel</button> <button class="btn small danger" data-action="delete" data-id="${esc(x.id)}">Delete</button></td></tr>`}).join("")||'<tr><td colspan="7">No sessions saved yet. Go to Stock Verification to start.</td></tr>'}
function viewReport(s){$("reportDetails").innerHTML=`<p><strong>${esc(s.date)}</strong> · Checked by ${esc(s.checker)} · Verified by ${esc(s.verifier||"Not specified")} · Reference: ${esc(s.source)}</p><div class="table-wrap"><table><thead><tr><th>Product</th><th>Live</th><th>Physical</th><th>Difference</th><th>Status</th><th>Defective</th><th>Remarks</th><th>Notes</th></tr></thead><tbody>${s.items.map(x=>`<tr><td>${esc(x.name)}</td><td>${x.live}</td><td>${x.physical}</td><td>${x.physical-x.live}</td><td>${pill(status(x.live,x.physical))}</td><td>${x.defective}</td><td>${esc(x.remark)}</td><td>${esc(x.note)}</td></tr>`).join("")}</tbody></table></div>`}
function exportReport(s){
  if(!window.XLSX)return message("reportMessage","Excel exporter is unavailable. Connect to the internet and reload the page to load SheetJS.",true);
  if(!s.items.length||s.items.some(x=>!isCount(x.physical)))return message("reportMessage","This session contains incomplete counts and cannot be exported.",true);
  const total=s.items.length,tally=s.items.filter(x=>status(x.live,x.physical)==="Tally").length;
  const data=[
    ["SMART BATTERY PHYSICAL STOCKTAKE REPORT"],
    ["Stocktake Date",s.date,"Stock Check By",s.checker],
    ["Verify By",s.verifier||"Not specified","Reference Source",s.source],
    ["Total Products",total,"Tally",tally,"Not Tally",total-tally],
    [],
    ["SKU","Product Name","Brand","Live Stock","Physical Count","Difference","Status","Defective Qty","Remarks","Additional Notes","Rack Units","Floor Units","Unopened Units"],
    ...s.items.map(x=>[x.sku,x.name,x.brand,x.live,x.physical,x.physical-x.live,status(x.live,x.physical),x.defective,x.remark,x.note,x.rack===""?"":Number(x.rack),x.floor===""?"":Number(x.floor),x.unopened===""?"":Number(x.unopened)])
  ];
  try{
    const wb=XLSX.utils.book_new(),ws=XLSX.utils.aoa_to_sheet(data);
    ws['!cols']=[{wch:20},{wch:42},{wch:16},{wch:15},{wch:18},{wch:15},{wch:16},{wch:17},{wch:19},{wch:45},{wch:15},{wch:15},{wch:18}];
    ws['!autofilter']={ref:`A6:M${data.length}`};
    XLSX.utils.book_append_sheet(wb,ws,"Stocktake Report");
    const summary=XLSX.utils.aoa_to_sheet([["STOCKTAKE SUMMARY"],["Date",s.date],["Checked By",s.checker],["Verified By",s.verifier||"Not specified"],["Source",s.source],["Products",total],["Tally",tally],["Not Tally",total-tally],["Defective Units",s.items.reduce((n,x)=>n+Number(x.defective||0),0)],["Review Note","Reopen and verify this Excel file before emailing."]]);
    summary['!cols']=[{wch:24},{wch:65}];
    XLSX.utils.book_append_sheet(wb,summary,"Summary");
    XLSX.writeFile(wb,`Stocktake_Report_${s.date}.xlsx`);
    message("reportMessage","Excel (.xlsx) downloaded. Open the file, recheck the values, save it and attach it to your email.");
  }catch(e){message("reportMessage",`Excel export failed: ${e.message}`,true)}
}
document.addEventListener("DOMContentLoaded",()=>{ensureRef();$("menuToggle")?.addEventListener("click",()=>{const side=document.querySelector(".sidebar");side.classList.toggle("open");$("menuToggle").setAttribute("aria-expanded",side.classList.contains("open"))});const requested=new URLSearchParams(window.location.search).get("page")||"index.html";
const page=["index.html","catalogue.html","import.html","verification.html","report.html"].includes(requested)?requested:"index.html";
document.querySelectorAll(".page-view").forEach(el=>el.classList.toggle("is-active",el.dataset.view===page));
document.querySelectorAll(".sidebar nav a").forEach(a=>{a.classList.toggle("active",new URL(a.href,window.location.href).searchParams.get("page")===page)});
document.title=({"index.html":"Dashboard","catalogue.html":"Battery Catalogue","import.html":"Import Stock","verification.html":"Stock Verification","report.html":"Stocktake Report"})[page]+" | Smart Battery Stocktake";
switch(page){case "index.html":renderDashboard();break;case "catalogue.html":renderCatalogue();$("catalogueSearch").addEventListener("input",renderCatalogue);break;case "import.html":renderImport();$("importBtn").addEventListener("click",doImport);break;case "verification.html":initVerification();$("verifySearch").addEventListener("input",renderVerification);$("verificationRows").addEventListener("click",e=>{const btn=e.target.closest("button[data-calc]");if(btn)openCalculator(Number(btn.dataset.calc))});["calcRack","calcFloor","calcUnopened"].forEach(id=>$(id).addEventListener("input",updateCalculator));$("calcPending").addEventListener("change",()=>{if(activeCalcIndex!==null){draft[activeCalcIndex].pending=$("calcPending").checked;if($("calcPending").checked){draft[activeCalcIndex].physical="";renderVerification()}saveDraft()}updateCalculator()});$("applyCalculator").addEventListener("click",applyCalculator);$("closeCalculator").addEventListener("click",()=>{$("countCalculator").classList.remove("open");activeCalcIndex=null});$("sessionDate").addEventListener("change",saveDraft);$("checker").addEventListener("input",saveDraft);$("verifier").addEventListener("input",saveDraft);$("verificationRows").addEventListener("input",updateRow);$("verificationRows").addEventListener("change",updateRow);$("saveSession").addEventListener("click",saveSession);$("clearCounts").addEventListener("click",()=>{if(confirm("Clear all unsaved physical counts and remarks?")){resetDraft();message("verifyMessage","Unsaved counts cleared.")}});break;case "report.html":renderReports();$("reportRows").addEventListener("click",e=>{const btn=e.target.closest("button[data-action]");if(!btn)return;const s=sessions().find(x=>x.id===btn.dataset.id);if(!s)return;if(btn.dataset.action==="view")viewReport(s);else if(btn.dataset.action==="export")exportReport(s);else if(btn.dataset.action==="delete"&&confirm("Delete this saved session?")){put(KEY_SESS,sessions().filter(x=>x.id!==s.id));renderReports();$("reportDetails").textContent="Choose View on a saved session."}});break}});
