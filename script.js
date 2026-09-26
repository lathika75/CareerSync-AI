/* =====================================================
   SkillMap AI - complete frontend prototype
   Features: profile, evidence uploads, role database,
   skill gaps, readiness, timed roadmap, projects,
   progress, skill validation assessment, Gemini assistant.
===================================================== */

/* ----------------------------
   1. ROLE / SKILL DATABASE
---------------------------- */
const careerData = {
  "Data Engineer": {
    description: "Design, build and maintain data pipelines and data platforms.",
    skills: { Python: 3, SQL: 3, ETL: 2, "Data Warehousing": 2, Spark: 2, Cloud: 2, Docker: 2, Git: 2 },
    learningTime: { Python:[2,3], SQL:[2,3], ETL:[2,3], "Data Warehousing":[2,3], Spark:[3,4], Cloud:[2,3], Docker:[1,2], Git:[1,1] },
    projects: [
      {icon:"🔄",title:"ETL Data Pipeline",description:"Build an automated pipeline that extracts, transforms and loads data.",skill:"ETL"},
      {icon:"⚡",title:"Spark Analytics Platform",description:"Process a large dataset using Apache Spark.",skill:"Spark"},
      {icon:"☁️",title:"Cloud Data Pipeline",description:"Build and deploy a basic cloud data pipeline.",skill:"Cloud"}
    ]
  },
  "Data Analyst": {
    description: "Analyze data and communicate insights using statistics and visualization.",
    skills: { Excel:3, SQL:3, Python:2, Statistics:2, "Power BI":2, Visualization:2, Communication:2 },
    learningTime: { Excel:[1,2], SQL:[2,3], Python:[2,3], Statistics:[2,3], "Power BI":[2,3], Visualization:[1,2], Communication:[1,2] },
    projects: [
      {icon:"📊",title:"Sales Analytics Dashboard",description:"Create a dashboard for sales and KPI analysis.",skill:"Power BI"},
      {icon:"📈",title:"Customer Analysis",description:"Analyze customer behavior using Python and statistics.",skill:"Python"},
      {icon:"🗄️",title:"SQL Business Analysis",description:"Answer business questions using SQL queries.",skill:"SQL"}
    ]
  },
  "ML Engineer": {
    description: "Develop, deploy and maintain machine learning systems.",
    skills: { Python:3, "Machine Learning":3, Statistics:2, "Deep Learning":2, TensorFlow:2, Deployment:2, MLOps:2, Git:2 },
    learningTime: { Python:[2,3], "Machine Learning":[3,4], Statistics:[2,3], "Deep Learning":[3,4], TensorFlow:[2,3], Deployment:[2,3], MLOps:[3,4], Git:[1,1] },
    projects: [
      {icon:"🤖",title:"ML Prediction System",description:"Build and evaluate a machine learning prediction system.",skill:"Machine Learning"},
      {icon:"🧠",title:"Deep Learning Application",description:"Develop a neural-network based application.",skill:"Deep Learning"},
      {icon:"🚀",title:"ML Model Deployment",description:"Deploy a trained model as a web API.",skill:"Deployment"}
    ]
  },
  "Frontend Developer": {
    description: "Build responsive and interactive web applications.",
    skills: { HTML:3, CSS:3, JavaScript:3, React:2, Git:2, UIUX:2, APIs:2 },
    learningTime: { HTML:[1,2], CSS:[1,2], JavaScript:[3,4], React:[2,3], Git:[1,1], UIUX:[2,3], APIs:[2,3] },
    projects: [
      {icon:"🌐",title:"Responsive Portfolio",description:"Create a responsive personal portfolio.",skill:"HTML"},
      {icon:"⚛️",title:"React Dashboard",description:"Build an interactive dashboard using React.",skill:"React"},
      {icon:"🔌",title:"API Web Application",description:"Connect a frontend app to a REST API.",skill:"APIs"}
    ]
  }
};

const initialSkills = {
  Python:2, SQL:1, ETL:0, "Data Warehousing":0, Spark:0, Cloud:1, Docker:0, Git:2,
  Excel:1, Statistics:1, "Power BI":0, Visualization:1, Communication:2,
  "Machine Learning":2, "Deep Learning":1, TensorFlow:0, Deployment:0, MLOps:0,
  HTML:2, CSS:2, JavaScript:2, React:1, UIUX:1, APIs:1
};

let currentRole = localStorage.getItem("skillmap_role") || "Data Engineer";
let selfRatings = loadJSON("skillmap_self", {...initialSkills});
let evidence = loadJSON("skillmap_evidence", {});
let projectProgress = loadJSON("skillmap_projects", {});
let learningStatus = loadJSON("skillmap_learning", {});
let assessmentHistory = loadJSON("skillmap_assessments", {});
let studentName = localStorage.getItem("skillmap_name") || "Lathika";
let uploadedFiles = [];
let chatHistory = [];
let activeQuizSkill = null;
let activeQuizQuestions = [];

/* IMPORTANT: paste a new Gemini key ONLY in your local file. */
const GEMINI_API_KEY = "AQ.Ab8RN6LQ3hxv5wnRcF0IvJT-N_g9tNtOdzNwyQxzWsqh4j441A";
const GEMINI_MODELS = ["gemini-3.8-flash", "gemini-3.7-flash", "gemini-3.6-flash"];
const GEMINI_RETRIES = 2;

function loadJSON(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}
function saveState() {
  localStorage.setItem("skillmap_role", currentRole);
  localStorage.setItem("skillmap_self", JSON.stringify(selfRatings));
  localStorage.setItem("skillmap_evidence", JSON.stringify(evidence));
  localStorage.setItem("skillmap_projects", JSON.stringify(projectProgress));
  localStorage.setItem("skillmap_learning", JSON.stringify(learningStatus));
  localStorage.setItem("skillmap_assessments", JSON.stringify(assessmentHistory));
  localStorage.setItem("skillmap_name", studentName);
}
function levelName(level) {
  return ["Not Started","Beginner","Intermediate","Advanced"][Number(level)] || "Unknown";
}
function getTimeRange(role, skill) { return careerData[role]?.learningTime?.[skill] || [1,2]; }
function formatWeeks(a,b) { return a === b ? `${a} week${a === 1 ? "" : "s"}` : `${a}–${b} weeks`; }
function remainingTime(skill, gap) {
  if (gap <= 0) return "Completed";
  const [a,b] = getTimeRange(currentRole, skill);
  return formatWeeks(a*gap,b*gap);
}
function fullSkillTime(role, skill, level) {
  const [a,b] = getTimeRange(role, skill);
  return formatWeeks(a*level,b*level);
}
function totalRemainingTime() {
  let min=0,max=0;
  getGaps().forEach(g => { const [a,b]=getTimeRange(currentRole,g.skill); min+=a*g.difference; max+=b*g.difference; });
  return formatWeeks(min,max);
}
function safeHTML(value) {
  return String(value).replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[ch]));
}

/* ----------------------------
   2. CORE SKILL ENGINE
---------------------------- */
function finalSkills() {
  const result = {...selfRatings};
  Object.entries(evidence).forEach(([skill, item]) => {
    result[skill] = Math.max(Number(result[skill]||0), Number(item.level||0));
  });
  return result;
}
function calculateReadiness() {
  const required = careerData[currentRole].skills;
  const actual = finalSkills();
  let total=0, got=0;
  Object.entries(required).forEach(([skill, requiredLevel]) => {
    total += requiredLevel;
    got += Math.min(Number(actual[skill]||0), requiredLevel);
  });
  return total ? Math.round(got/total*100) : 0;
}
function getGaps() {
  const required=careerData[currentRole].skills;
  const actual=finalSkills();
  return Object.entries(required).map(([skill,requiredLevel])=>({skill,current:Number(actual[skill]||0),required:requiredLevel,difference:Math.max(requiredLevel-Number(actual[skill]||0),0)})).filter(g=>g.difference>0).sort((a,b)=>b.difference-a.difference);
}
function matchedCount() { return Object.keys(careerData[currentRole].skills).length - getGaps().length; }

/* ----------------------------
   3. NAVIGATION
---------------------------- */
const pageTitles = {
  dashboard:"Skill Readiness Dashboard", profile:"Student Profile & Evidence", assessment:"Skill Assessment",
  career:"Career Roles", roadmap:"Your Adaptive Roadmap", projects:"Skill-Building Projects",
  progress:"Progress Tracking", assistant:"AI Career Assistant"
};
function showPage(pageId, button) {
  document.querySelectorAll(".page").forEach(p=>p.classList.remove("active-page"));
  const page=document.getElementById(pageId);
  if(page) page.classList.add("active-page");
  document.querySelectorAll(".nav-item").forEach(b=>b.classList.remove("active"));
  if(button) button.classList.add("active");
  document.getElementById("pageTitle").textContent=pageTitles[pageId]||"SkillMap AI";
  if(pageId==="profile") { renderFiles(); renderComparison(); }
  if(pageId==="assessment") renderAssessmentSkills();
  if(pageId==="career") renderCareerCards();
  if(pageId==="roadmap") renderRoadmap();
  if(pageId==="projects") renderProjects();
  if(pageId==="progress") renderProgress();
  if(pageId==="assistant") renderAIContext();
}
function showPageById(pageId){ showPage(pageId,document.querySelector(`.nav-item[data-page="${pageId}"]`)); }

/* ----------------------------
   4. CAREER ROLE UI
---------------------------- */
function populateCareerSelectors() {
  const options=Object.keys(careerData).map(role=>`<option value="${safeHTML(role)}">${safeHTML(role)}</option>`).join("");
  document.getElementById("careerSelect").innerHTML=options;
  document.getElementById("profileCareer").innerHTML=options;
  document.getElementById("careerSelect").value=currentRole;
  document.getElementById("profileCareer").value=currentRole;
}
function changeCareer() {
  currentRole=document.getElementById("careerSelect").value;
  document.getElementById("profileCareer").value=currentRole;
  saveState();
  refreshAllViews();
  toast(`Target role: ${currentRole}`);
}
function syncCareerFromProfile() {
  currentRole=document.getElementById("profileCareer").value;
  document.getElementById("careerSelect").value=currentRole;
  saveState();
  refreshAllViews();
  toast(`Target role: ${currentRole}`);
}
function renderCareerCards() {
  const root=document.getElementById("careerCards"); root.innerHTML="";
  Object.entries(careerData).forEach(([role,data],idx)=>{
    const id=`career-detail-${idx}`;
    const tags=Object.keys(data.skills).slice(0,6).map(s=>`<span class="tag">${safeHTML(s)}</span>`).join("");
    const rows=Object.entries(data.skills).map(([skill,level])=>`<div class="detail-row"><span><strong>${safeHTML(skill)}</strong><br>${levelName(level)} required</span><span class="detail-time">⏱ ${fullSkillTime(role,skill,level)}</span></div>`).join("");
    root.insertAdjacentHTML("beforeend",`<article class="career-card"><div class="career-card-icon">🎯</div><h3>${safeHTML(role)}</h3><p>${safeHTML(data.description)}</p><div class="tags">${tags}</div><div class="time-summary"><span>Estimated complete-role learning</span><strong>${estimateFullRoleTime(role)}</strong></div><button class="details-btn" onclick="toggleDetails('${id}',this)">View Skills & Time ↓</button><div id="${id}" class="skill-details" hidden>${rows}<p>Time is an estimate for the prototype. Skills may be learned in parallel.</p></div><button class="secondary select-role" onclick="selectCareer('${safeHTML(role)}')">Select Role →</button></article>`);
  });
}
function estimateFullRoleTime(role) {
  let min=0,max=0;
  Object.entries(careerData[role].skills).forEach(([skill,level])=>{const [a,b]=getTimeRange(role,skill);min+=a*level;max+=b*level;});
  return formatWeeks(min,max);
}
function toggleDetails(id,button){const el=document.getElementById(id);if(!el)return;el.hidden=!el.hidden;button.textContent=el.hidden?"View Skills & Time ↓":"Hide Skills & Time ↑";}
function selectCareer(role){currentRole=role;document.getElementById("careerSelect").value=role;document.getElementById("profileCareer").value=role;saveState();refreshAllViews();showPageById("assessment");toast(`${role} selected`);}

/* ----------------------------
   5. ASSESSMENT SLIDERS
---------------------------- */
function renderAssessmentSkills() {
  const root=document.getElementById("assessmentSkills"); root.innerHTML="";
  Object.entries(careerData[currentRole].skills).forEach(([skill,required])=>{
    const current=Number(finalSkills()[skill]||0);
    const gap=Math.max(required-current,0);
    root.insertAdjacentHTML("beforeend",`<div class="skill-item"><div class="skill-top"><span><strong>${safeHTML(skill)}</strong></span><span id="level-${cssId(skill)}">${levelName(current)} · ⏱ ${remainingTime(skill,gap)}</span></div><input type="range" class="range" min="0" max="3" value="${current}" data-skill="${safeHTML(skill)}" oninput="updateSkillSlider(this)"></div>`);
  });
}
function cssId(text){return String(text).replace(/[^a-zA-Z0-9_-]/g,"-");}
function updateSkillSlider(slider){
  const skill=slider.dataset.skill;
  const current=Number(slider.value);

  selfRatings[skill]=current;

  /*
     Advanced unlock rule:
     When the skill range reaches level 3 (Advanced), the
     quiz becomes unlocked automatically.
  */
  const reachedAdvanced = current >= 3;

  if(reachedAdvanced){
    learningStatus[skill]=Math.max(Number(learningStatus[skill]||0),2);
  } else if(Number(learningStatus[skill]||0) === 2){
    learningStatus[skill]=0;
  }

  saveState();

  const required=careerData[currentRole].skills[skill]||0;
  const el=document.getElementById(`level-${cssId(skill)}`);

  if(el){
    el.textContent=`${levelName(current)} · ⏱ ${remainingTime(skill,Math.max(required-current,0))}`;
  }

  refreshAllViews(false);

  /* Open the quiz automatically as soon as Advanced is reached. */
  if(reachedAdvanced && typeof startSkillAssessment === "function"){
    setTimeout(()=>startSkillAssessment(skill),150);
  }
}
function analyzeSkills(){saveState();refreshAllViews();toast("Readiness and roadmap updated");showPageById("dashboard");}

/* ----------------------------
   6. DASHBOARD / ROADMAP / PROGRESS
---------------------------- */
function renderDashboard(){
  const readiness=calculateReadiness(); const gaps=getGaps(); const total=Object.keys(careerData[currentRole].skills).length;
  document.getElementById("heroScore").textContent=`${readiness}%`;
  document.getElementById("dashboardRole").textContent=currentRole;
  document.getElementById("matchedSkills").textContent=`${matchedCount()} / ${total}`;
  document.getElementById("gapSkills").textContent=gaps.length;
  document.getElementById("progressValue").textContent=`${readiness}%`;
  const ring=document.querySelector(".score-ring"); ring.style.background=`conic-gradient(#7b6ff1 0 ${readiness*3.6}deg,#393c59 ${readiness*3.6}deg)`;
  const root=document.getElementById("dashboardSkills"); root.innerHTML="";
  Object.entries(careerData[currentRole].skills).forEach(([skill,required])=>{
    const current=Number(finalSkills()[skill]||0); const pct=Math.min(100,Math.round(current/required*100));
    root.insertAdjacentHTML("beforeend",`<div class="skill-row"><div class="skill-top"><span>${safeHTML(skill)}</span><span>${levelName(current)} / ${levelName(required)}</span></div><div class="bar"><div class="fill" style="width:${pct}%"></div></div></div>`);
  });
  if(gaps[0]){document.getElementById("nextSkill").textContent=`Focus on ${gaps[0].skill}`;document.getElementById("nextSkillText").textContent=`${gaps[0].skill} has a ${gaps[0].difference}-level gap. Estimated remaining time: ${remainingTime(gaps[0].skill,gaps[0].difference)}.`;}
  else{document.getElementById("nextSkill").textContent="All required skills reached";document.getElementById("nextSkillText").textContent="Continue validating skills and building portfolio evidence.";}
}
function learningStateLabel(skill){
  const state=Number(learningStatus[skill]||0);
  const current=Number(selfRatings[skill]||0);

  if(state>=3) return "Advanced Validated ✓";
  if(current>=3) return "Advanced • Quiz Ready";
  if(state===1) return "Learning";
  return "Not Started";
}
function setLearningState(skill){
  const state=Number(learningStatus[skill]||0);
  const current=Number(selfRatings[skill]||0);

  if(state>=3){
    toast(`${skill} is already validated`);
    return;
  }

  if(current >= 3){
    learningStatus[skill]=2;
    saveState();
    refreshAllViews();
    setTimeout(()=>startSkillAssessment(skill),150);
    return;
  }

  learningStatus[skill]=1;
  saveState();
  refreshAllViews();
  toast(`${skill}: learning started. Reach Advanced to unlock the quiz.`);
}
function roadmapSkillAction(skill){
  const current=Number(selfRatings[skill]||0);

  /* Quiz is available only after the slider reaches Advanced. */
  if(current < 3){
    toast(`Increase ${skill} to Advanced to unlock the quiz.`);
    return;
  }

  learningStatus[skill]=2;
  saveState();
  refreshAllViews();
  startSkillAssessment(skill);
}
function renderRoadmap(){
  const gaps=getGaps();
  document.getElementById("roadmapReadiness").textContent=`${calculateReadiness()}%`;
  document.getElementById("roadmapGapCount").textContent=gaps.length;
  document.getElementById("roadmapTotalTime").textContent=totalRemainingTime();
  const root=document.getElementById("roadmapSteps"); root.innerHTML="";
  if(!gaps.length){root.innerHTML=`<div class="panel"><h3>🎉 No remaining skill gaps</h3><p>Your current profile meets the stored competency requirements for ${safeHTML(currentRole)}.</p></div>`;return;}
  gaps.forEach((gap,index)=>{
    const project=careerData[currentRole].projects.find(p=>p.skill===gap.skill);
    const evidenceText=evidence[gap.skill]?`Evidence: ${evidence[gap.skill].source}`:"No document evidence";
    const state=Number(learningStatus[gap.skill]||0);
    const selfLevel=Number(selfRatings[gap.skill]||0);
    let actionText="Increase Skill to Advanced →", helperText=`Raise ${gap.skill} to Advanced in Skill Assessment. The quiz opens automatically.`, actionClass="learn-action";
    if(state>=3){ actionText="Advanced Skill Validated ✓"; helperText="Assessment passed. Your Advanced skill is validated."; actionClass="validated-action"; }
    else if(selfLevel>=3){ actionText="Take Advanced Skill Quiz →"; helperText="Advanced reached. Complete the quiz to validate this skill."; actionClass="quiz-action"; }
    else if(state===1){ actionText="Continue Learning →"; helperText=`Continue learning ${gap.skill}; the quiz unlocks when the slider reaches Advanced.`; }
    root.insertAdjacentHTML("beforeend",`
      <div class="roadmap-step">
        <div class="road-dot">${index+1}</div>
        <div class="road-card">
          <div class="road-top"><h3>${safeHTML(gap.skill)}</h3><span class="road-time">⏱ ${remainingTime(gap.skill,gap.difference)}</span></div>
          <p>Move from ${levelName(gap.current)} to ${levelName(gap.required)} for ${safeHTML(currentRole)}.${project?` Suggested project: ${safeHTML(project.title)}.`:""}</p>
          <div class="road-meta"><span>${levelName(gap.current)} → ${levelName(gap.required)}</span><span>${evidenceText}</span><span class="learning-state state-${state}">${learningStateLabel(gap.skill)}</span></div>
          <div class="road-learning-helper">${helperText}</div>
          <div class="road-actions"><button class="${actionClass}" onclick="roadmapSkillAction('${safeHTML(gap.skill)}')">${actionText}</button></div>
        </div>
      </div>`);
  });
}

function renderProjects(){
  const root=document.getElementById("projectCards"); root.innerHTML=""; const gaps=getGaps(); const role=careerData[currentRole];
  let projects=role.projects.filter(p=>gaps.some(g=>g.skill===p.skill)); if(!projects.length) projects=role.projects;
  projects.forEach(p=>{const done=projectProgress[p.skill]||0;root.insertAdjacentHTML("beforeend",`<article class="project-card"><div class="project-icon">${p.icon}</div><h3>${safeHTML(p.title)}</h3><p>${safeHTML(p.description)}</p><span class="tag">Builds: ${safeHTML(p.skill)}</span><br><button onclick="completeProject('${safeHTML(p.skill)}')">${done?"Project Completed ✓":"Mark Project Completed"}</button></article>`);});
}
function completeProject(skill){
  projectProgress[skill]=1;
  if(Number(learningStatus[skill]||0)===0) learningStatus[skill]=1;
  saveState(); refreshAllViews();
  toast(`${skill} project completed. Finish learning to unlock the quiz.`);
}

function renderProgress(){
  const readiness=calculateReadiness(); document.getElementById("progressCircle").textContent=`${readiness}%`; const ring=document.getElementById("progressRing"); ring.style.background=`conic-gradient(#7569ef 0 ${readiness*3.6}deg,#ecebf3 ${readiness*3.6}deg)`; document.getElementById("progressMessage").textContent=readiness>=80?"You are approaching strong role readiness.":readiness>=50?"Good progress. Focus on the remaining gaps.":"Start with the highest-priority gap on your roadmap.";
  const root=document.getElementById("progressSkills");root.innerHTML="";Object.entries(careerData[currentRole].skills).forEach(([skill,required])=>{const current=Number(finalSkills()[skill]||0);const pct=Math.round(current/required*100);root.insertAdjacentHTML("beforeend",`<div class="progress-item"><div class="progress-item-top"><span>${safeHTML(skill)}</span><span>${pct}%</span></div><div class="bar"><div class="fill" style="width:${Math.min(pct,100)}%"></div></div></div>`);});
}

/* ----------------------------
   7. FILE UPLOADS + LOCAL EVIDENCE
---------------------------- */
function handleResumeFile(event){const file=event.target.files?.[0];if(file){uploadedFiles=[{type:"Resume",file}];renderFiles();}}
function handleCertificateFiles(event){uploadedFiles=[...uploadedFiles.filter(x=>x.type!=="Certificate"),...Array.from(event.target.files||[]).map(file=>({type:"Certificate",file}))];renderFiles();}
function renderFiles(){const root=document.getElementById("fileList");if(!root)return;root.innerHTML=uploadedFiles.length?uploadedFiles.map(x=>`<div class="file-row"><span>${x.type==="Resume"?"📄":"🏆"}</span><div><strong>${safeHTML(x.file.name)}</strong><small>${safeHTML(x.type)} · ${Math.round(x.file.size/1024)} KB</small></div></div>`).join(""):"<span class=\"hint\">No files selected yet.</span>";}
/* ----------------------------
   7. FILE UPLOADS + LOCAL EVIDENCE ANALYSIS
   ----------------------------------------------------
   Resume and certificate analysis does NOT use Gemini.
   The browser extracts text locally, then matches the
   text against the selected role's skill taxonomy.

   Gemini API is reserved for the AI Career Assistant.
---------------------------- */
function handleResumeFile(event){
  const file=event.target.files?.[0];
  if(file){
    uploadedFiles=[{type:"Resume",file}];
    renderFiles();
    toast("Resume added. Click Analyze to extract skill evidence locally.");
  }
}

function handleCertificateFiles(event){
  const files=Array.from(event.target.files||[]);
  uploadedFiles=[
    ...uploadedFiles.filter(x=>x.type!=="Certificate"),
    ...files.map(file=>({type:"Certificate",file}))
  ];
  renderFiles();
  if(files.length) toast(`${files.length} certificate${files.length>1?"s":""} added.`);
}

function renderFiles(){
  const root=document.getElementById("fileList");
  if(!root)return;
  root.innerHTML=uploadedFiles.length
    ? uploadedFiles.map(x=>`<div class="file-row"><span>${x.type==="Resume"?"📄":"🏆"}</span><div><strong>${safeHTML(x.file.name)}</strong><small>${safeHTML(x.type)} · ${Math.max(1,Math.round(x.file.size/1024))} KB</small></div></div>`).join("")
    : '<span class="hint">No files selected yet.</span>';
}

function normalizeSkill(name){
  const aliases={
    "apache spark":"Spark","spark":"Spark",
    "aws":"Cloud","amazon web services":"Cloud","azure":"Cloud","google cloud":"Cloud","cloud computing":"Cloud",
    "data warehouse":"Data Warehousing","data warehousing":"Data Warehousing",
    "power bi":"Power BI","machine learning":"Machine Learning","ml":"Machine Learning",
    "deep learning":"Deep Learning","tensorflow":"TensorFlow","react.js":"React","react js":"React",
    "rest api":"APIs","rest apis":"APIs","api development":"APIs","ui/ux":"UIUX",
    "structured query language":"SQL","python programming":"Python","python programming language":"Python"
  };
  const low=String(name||"").trim().toLowerCase();
  if(aliases[low])return aliases[low];
  return Object.keys(initialSkills).find(s=>s.toLowerCase()===low)||null;
}

function fileExtension(file){
  const name=file?.name||"";
  const i=name.lastIndexOf(".");
  return i>=0?name.slice(i+1).toLowerCase():"";
}

async function extractPdfText(file){
  if(!window.pdfjsLib){
    throw new Error("PDF reader is not loaded yet. Refresh the page and try again.");
  }

  if(window.pdfjsLib.GlobalWorkerOptions){
    window.pdfjsLib.GlobalWorkerOptions.workerSrc=
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  }

  const buffer=await file.arrayBuffer();
  const pdf=await window.pdfjsLib.getDocument({data:buffer}).promise;
  let text="";

  for(let i=1;i<=pdf.numPages;i++){
    const page=await pdf.getPage(i);
    const content=await page.getTextContent();
    const pageText=content.items
      .map(item=>item.str||"")
      .join(" ");
    text+=pageText+"\n";
  }

  return text;
}

async function extractDocxText(file){
  if(!window.mammoth){
    throw new Error("DOCX reader is not loaded yet. Refresh the page and try again.");
  }

  const arrayBuffer=await file.arrayBuffer();
  const result=await window.mammoth.extractRawText({arrayBuffer});
  return result.value||"";
}

async function extractImageText(file){
  if(!window.Tesseract){
    throw new Error("Image OCR library is not loaded yet. Refresh the page and try again.");
  }

  const result=await window.Tesseract.recognize(file,"eng",{
    logger:msg=>{
      if(msg?.status && msg.progress!==undefined){
        const pct=Math.round(msg.progress*100);
        const status=document.getElementById("analyzeBtn");
        if(status)status.textContent=`Reading image... ${pct}%`;
      }
    }
  });

  return result?.data?.text||"";
}

async function extractLocalFileText(file){
  const ext=fileExtension(file);
  const maxLocalTextSize=8*1024*1024;

  if(file.size>maxLocalTextSize){
    throw new Error(`${file.name} is larger than 8 MB.`);
  }

  if(ext==="txt" || ext==="csv" || ext==="json"){
    return await file.text();
  }

  if(ext==="docx"){
    return await extractDocxText(file);
  }

  if(ext==="pdf"){
    return await extractPdfText(file);
  }

  if(["png","jpg","jpeg","webp"].includes(ext)){
    return await extractImageText(file);
  }

  return "";
}

function roleSkillTerms(skill){
  const map={
    Python:[
      "python","python programming","pandas","numpy","scikit-learn"
    ],
    SQL:[
      "sql","structured query language","mysql","postgresql","postgres","sqlite","database queries","sql queries"
    ],
    ETL:[
      "etl","extract transform load","extract, transform, load","data pipeline","data pipelines","pipeline development","pipeline"
    ],
    "Data Warehousing":[
      "data warehouse","data warehousing","datawarehouse","star schema","snowflake","redshift","dimensional modeling","fact table","dimension table"
    ],
    Spark:[
      "spark","apache spark","pyspark","spark sql","spark framework"
    ],
    Cloud:[
      "cloud","aws","amazon web services","azure","google cloud","gcp","cloud computing","cloud platform"
    ],
    Docker:[
      "docker","containerization","containerized","containers","dockerfile"
    ],
    Git:[
      "git","github","gitlab","version control","source control"
    ],
    Excel:[
      "excel","microsoft excel","spreadsheet","spreadsheets","pivot table","vlookup","xlookup"
    ],
    Statistics:[
      "statistics","statistical analysis","hypothesis testing","probability","regression","descriptive statistics","inferential statistics"
    ],
    "Power BI":[
      "power bi","powerbi","dax","power query"
    ],
    Visualization:[
      "data visualization","visualization","visualisations","dashboard","dashboards","charts","plotly","matplotlib","tableau"
    ],
    Communication:[
      "communication","presentation","presentations","teamwork","collaboration","stakeholder management"
    ],
    "Machine Learning":[
      "machine learning","ml model","ml models","scikit-learn","sklearn","classification","regression model","predictive modeling"
    ],
    "Deep Learning":[
      "deep learning","neural network","neural networks","cnn","rnn","transformer","lstm"
    ],
    TensorFlow:[
      "tensorflow","keras","tf.keras"
    ],
    Deployment:[
      "deployment","deployed","deploying","model serving","inference api","production api","production deployment","serving models"
    ],
    MLOps:[
      "mlops","model monitoring","model registry","model versioning","ci/cd","ml pipeline","continuous integration","continuous deployment"
    ],
    HTML:[
      "html","html5","hypertext markup language"
    ],
    CSS:[
      "css","css3","cascading style sheets","responsive design","responsive web design"
    ],
    JavaScript:[
      "javascript","js","ecmascript","vanilla javascript"
    ],
    React:[
      "react","react.js","reactjs","react js"
    ],
    UIUX:[
      "ui/ux","ui ux","ux design","user experience","wireframe","wireframes","figma","user interface design"
    ],
    APIs:[
      "api","apis","rest api","rest apis","restful api","http api","json api","web api"
    ]
  };

  return map[skill]||[skill.toLowerCase()];
}

function termMatches(text, term){
  const normalized=String(text||"").toLowerCase();
  const target=String(term||"").toLowerCase().trim();

  if(!target)return [];

  const escaped=target.replace(/[.*+?^${}()|[\\]\\]/g,"\\$&");
  const isPhrase=target.includes(" ") || target.includes("/") || target.includes(".") || target.includes(",");

  const pattern=isPhrase
    ? new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`,'gi')
    : new RegExp(`\\b${escaped}\\b`,'gi');

  const hits=[];
  let match;
  while((match=pattern.exec(normalized))!==null){
    hits.push(match.index);
    if(pattern.lastIndex===match.index)pattern.lastIndex++;
  }
  return hits;
}

function countSkillMatches(text, terms){
  let total=0;
  const hits=[];

  terms.forEach(term=>{
    const positions=termMatches(text,term);
    total+=positions.length;
    positions.slice(0,5).forEach(position=>{
      hits.push({term,position});
    });
  });

  hits.sort((a,b)=>a.position-b.position);

  return {count:total,hits};
}

function nearbyContext(text, position){
  const source=String(text||"");
  const start=Math.max(0,position-170);
  const end=Math.min(source.length,position+260);
  return source.slice(start,end).replace(/\\s+/g," ").trim();
}

function inferEvidenceLevel(text, skill, source){
  const raw=String(text||"");
  const lower=raw.toLowerCase();
  const terms=roleSkillTerms(skill);
  const matchInfo=countSkillMatches(lower,terms);

  if(!matchInfo.count){
    return {level:0,matches:[],context:""};
  }

  const contexts=matchInfo.hits.slice(0,5).map(
    hit=>nearbyContext(raw,hit.position)
  );

  /* A certificate proves exposure/learning evidence, not practical mastery. */
  if(source==="Certificate"){
    return {
      level:1,
      matches:matchInfo.hits.map(x=>x.term),
      context:contexts[0]||""
    };
  }

  const practicalWords=[
    "project","projects","developed","built","implemented","created",
    "designed","worked on","used","using","experience","internship",
    "deployed","pipeline","application","dashboard","system","client",
    "intern","training","hands-on"
  ];

  const advancedWords=[
    "advanced","production","architecture","optimized","optimization",
    "scaled","scaling","led","lead","designed architecture",
    "years of experience","professional experience","end-to-end"
  ];

  const practicalHit=practicalWords.some(word=>lower.includes(word));
  const advancedHit=advancedWords.some(word=>lower.includes(word));

  let level=1;

  if(practicalHit || matchInfo.count>=2)level=2;
  if((practicalHit && advancedHit) || matchInfo.count>=4)level=3;

  return {
    level,
    matches:matchInfo.hits.map(x=>x.term),
    context:contexts[0]||""
  };
}

function buildEvidenceSummary(source, fileName, text){
  const roleSkills=careerData[currentRole].skills;
  const found=[];
  const fullText=String(text||"");

  Object.keys(roleSkills).forEach(skill=>{
    const result=inferEvidenceLevel(fullText,skill,source);

    if(result.level>0){
      const uniqueMatches=[...new Set(result.matches)].slice(0,4);

      found.push({
        name:skill,
        level:result.level,
        source:source,
        fileName:fileName,
        matches:uniqueMatches,
        evidence:
          result.context ||
          `Matched ${uniqueMatches.join(", ")} in ${fileName}.`
      });
    }
  });

  return found;
}

function filenameEvidence(source,fileName){
  return buildEvidenceSummary(
    source,
    fileName,
    fileName.replace(/[_.-]+/g," ")
  );
}

async function analyzeEvidence(){
  if(!uploadedFiles.length){
    toast("Upload a resume or certificate first.");
    return;
  }

  const btn=document.getElementById("analyzeBtn");
  if(btn){
    btn.disabled=true;
    btn.textContent="Analyzing locally...";
  }

  try{
    const allEvidence=[];
    let parsedDocumentCount=0;

    for(const item of uploadedFiles){
      let text="";

      try{
        text=await extractLocalFileText(item.file);
        if(String(text).trim())parsedDocumentCount++;
      }catch(err){
        console.warn(`Local parsing failed for ${item.file.name}:`,err);
      }

      const usableText=String(text||"").trim();

      if(usableText){
        allEvidence.push(
          ...buildEvidenceSummary(
            item.type,
            item.file.name,
            usableText
          )
        );
      }else{
        /* Filename fallback is deliberately weak evidence. */
        allEvidence.push(
          ...filenameEvidence(item.type,item.file.name)
        );
      }
    }

    /* Merge evidence per skill while preserving all sources. */
    const merged={};

    allEvidence.forEach(item=>{
      if(!merged[item.name]){
        merged[item.name]={
          name:item.name,
          level:item.level,
          source:item.source,
          evidence:item.evidence,
          files:[item.fileName],
          matches:item.matches||[]
        };
        return;
      }

      const existing=merged[item.name];

      existing.level=Math.max(
        existing.level,
        item.level
      );

      if(!existing.files.includes(item.fileName)){
        existing.files.push(item.fileName);
      }

      if(item.matches){
        existing.matches=[
          ...new Set(
            [...existing.matches,...item.matches]
          )
        ].slice(0,6);
      }

      if(existing.source!==item.source){
        existing.source="Resume + Certificate";
        existing.evidence=
          `${existing.evidence} | ${item.evidence}`;
      }
    });

    evidence=merged;
    saveState();
    refreshAllViews();

    const count=Object.keys(evidence).length;

    if(count){
      const parserMessage=
        parsedDocumentCount===uploadedFiles.length
          ? "Documents were read locally."
          : "Some files could not be text-read; filename matching was used as a fallback.";

      toast(
        `Found evidence for ${count} role skill${count===1?"":"s"}. ${parserMessage} No API key was used.`
      );
    }else{
      toast(
        "No matching role skills were found. Use a text-readable resume/certificate or update your self-ratings."
      );
    }
  }catch(err){
    console.error("Local evidence analysis failed:",err);
    toast(`Evidence analysis failed: ${err.message}`);
  }finally{
    if(btn){
      btn.disabled=false;
      btn.textContent="Analyze Resume & Certificates →";
    }
  }
}

function renderComparison(){
  const root=document.getElementById("comparison");
  if(!root)return;

  const roleSkills=careerData[currentRole].skills;
  const actual=finalSkills();

  let html=`<div class="comparison-head"><span>Skill</span><span>Self</span><span>Evidence</span><span>Final</span></div>`;

  Object.entries(roleSkills).forEach(([skill,required])=>{
    const self=Number(selfRatings[skill]||0);
    const ev=evidence[skill];
    const finalLevel=Number(actual[skill]||0);

    const evidenceDetails=ev
      ? `<span class="comp-source">
          ${safeHTML(ev.source)} · ${safeHTML((ev.files||[]).join(", "))}
         </span>
         <span class="comp-source">
          Match: ${safeHTML((ev.matches||[]).join(", "))}
         </span>
         <span class="comp-evidence">
          ${safeHTML(ev.evidence)}
         </span>`
      : `<span class="comp-source muted-evidence">No document evidence</span>`;

    html+=`<div class="comparison-row">
      <div class="comp-skill">
        <strong>${safeHTML(skill)}</strong>
        <small>Required: ${levelName(required)}</small>
        ${evidenceDetails}
      </div>
      <span class="comp-level">${levelName(self)}</span>
      <span class="comp-level ${ev?"evidence-level":""}">${ev?levelName(ev.level):"Not found"}</span>
      <span class="comp-level comp-final">${levelName(finalLevel)}</span>
    </div>`;
  });

  root.className="";
  root.innerHTML=html;
}

/* ----------------------------
   8. POST-SKILL ASSESSMENT
---------------------------- */
const quizBank={
  Python:[
    {q:"Which Python structure stores key-value pairs?",o:["List","Dictionary","Tuple","Set"],a:1},
    {q:"Which keyword defines a function?",o:["func","define","def","function"],a:2},
    {q:"What does len([10,20,30]) return?",o:["2","3","4","30"],a:1}
  ],
  SQL:[
    {q:"Which SQL command reads rows?",o:["SELECT","READ","PULL","GETALL"],a:0},
    {q:"Which clause filters rows?",o:["ORDER BY","WHERE","GROUP BY","FROM"],a:1},
    {q:"Which operation combines matching table rows?",o:["JOIN","LINK","MERGEALL","CONNECT"],a:0}
  ],
  ETL:[
    {q:"What does ETL stand for?",o:["Extract, Transform, Load","Evaluate, Train, Learn","Encode, Transfer, Load","Extract, Test, Launch"],a:0},
    {q:"Which stage cleans or reshapes data?",o:["Extract","Transform","Load","Backup"],a:1},
    {q:"Where is transformed data typically written?",o:["Source system","IDE","Target data store","Browser cache"],a:2}
  ],
  Spark:[
    {q:"Apache Spark is mainly used for:",o:["Distributed data processing","Photo editing","Word processing","UI styling"],a:0},
    {q:"Which Spark abstraction is common for tabular data?",o:["DataFrame","Canvas","Document","Widget"],a:0},
    {q:"Spark can process data across:",o:["One CPU core only","A cluster of machines","Only a browser","Only a text editor"],a:1}
  ],
  Cloud:[
    {q:"Cloud computing commonly provides:",o:["On-demand computing resources","Only offline storage","Only printers","Only desktop apps"],a:0},
    {q:"An object-storage example is:",o:["Cloud storage bucket","CPU register","Keyboard","RAM slot"],a:0},
    {q:"A common cloud benefit is:",o:["Elastic scaling","No security responsibility","Guaranteed zero cost","No internet requirement"],a:0}
  ],
  Docker:[
    {q:"Docker is mainly used for:",o:["Containerizing applications","Editing video","Designing logos","Writing SQL only"],a:0},
    {q:"A Docker image defines:",o:["A container environment","Only photographs","A keyboard layout","A database table"],a:0},
    {q:"Which file commonly defines a Docker image build?",o:["Dockerfile","Docker.txt","Build.ini","Container.doc"],a:0}
  ],
  Git:[
    {q:"Which command creates a local Git repository?",o:["git init","git start","git repo","git create"],a:0},
    {q:"Which command records staged changes?",o:["git push","git commit","git save","git record"],a:1},
    {q:"Which command sends local commits to a remote?",o:["git upload","git push","git send","git publish"],a:1}
  ],
  Excel:[
    {q:"Which Excel function adds values?",o:["SUM","ADDUP","TOTAL","PLUS"],a:0},
    {q:"A pivot table is commonly used for:",o:["Data summarization","Video editing","Compiling code","Drawing icons"],a:0},
    {q:"Which feature filters rows by conditions?",o:["Filter","Brush","Compile","Render"],a:0}
  ],
  Statistics:[
    {q:"The middle value after sorting is:",o:["Mean","Median","Range","Variance"],a:1},
    {q:"Standard deviation measures:",o:["Spread of data","Rows only","File size","Column names"],a:0},
    {q:"Correlation near +1 suggests:",o:["Strong positive linear relationship","No relationship","Strong negative relationship","Missing data"],a:0}
  ],
  "Machine Learning":[
    {q:"Supervised learning uses:",o:["Labeled examples","No data","Random numbers only","Only images"],a:0},
    {q:"Classification predicts:",o:["Categories","Only continuous values","Schemas","Text length"],a:0},
    {q:"Overfitting means a model:",o:["Fits training data too closely and generalizes poorly","Always has low training accuracy","Has no parameters","Cannot learn"],a:0}
  ],
  "Deep Learning":[
    {q:"Deep learning commonly uses:",o:["Neural networks","Only SQL joins","Only spreadsheets","Only containers"],a:0},
    {q:"CNNs are commonly used for:",o:["Image and spatial pattern tasks","Version control","Cloud billing","Database backups"],a:0},
    {q:"Activation functions help learn:",o:["Non-linear patterns","File names","Keyboard shortcuts","Disk partitions"],a:0}
  ],
  TensorFlow:[
    {q:"TensorFlow is primarily a framework for:",o:["Machine learning","Version control","Web browsing","Text formatting"],a:0},
    {q:"Tensors represent:",o:["Multi-dimensional numerical data","Passwords","URLs","File names"],a:0},
    {q:"A trained model can be used for:",o:["Inference on new data","Only HTML","Only Git","Only indexing"],a:0}
  ],
  Deployment:[
    {q:"Model deployment means:",o:["Making a trained model available for use","Deleting it","Renaming it","Only labeling data"],a:0},
    {q:"An API can allow applications to:",o:["Request predictions","Only draw icons","Only edit sheets","Only store images"],a:0},
    {q:"A health check helps verify:",o:["Service availability","Font size","Keyboard layout","Screen brightness"],a:0}
  ],
  MLOps:[
    {q:"MLOps focuses on:",o:["Operating and maintaining ML systems","Only drawing neural networks","Only collecting images","Only creating slides"],a:0},
    {q:"Model monitoring can track:",o:["Performance and drift","Battery level","CSS styles","File names"],a:0},
    {q:"CI/CD can automate:",o:["Testing and deployment","Screenshot capture","Typing","Password generation"],a:0}
  ],
  HTML:[
    {q:"HTML defines:",o:["Web page structure","Database queries","ML models","Container images"],a:0},
    {q:"Which element creates a hyperlink?",o:["<a>","<p>","<div>","<img>"],a:0},
    {q:"Main page heading commonly uses:",o:["<h1>","<span>","<br>","<input>"],a:0}
  ],
  CSS:[
    {q:"CSS is mainly used for:",o:["Styling web pages","Writing SQL","Training models","Managing containers"],a:0},
    {q:"Which property changes text color?",o:["color","font-style","background","display"],a:0},
    {q:"Flexbox is useful for:",o:["Layout alignment","Database backups","Model training","Image OCR"],a:0}
  ],
  JavaScript:[
    {q:"JavaScript adds:",o:["Interactivity and logic","Only text formatting","Only storage","Only compression"],a:0},
    {q:"Which keyword declares a changeable block-scoped variable?",o:["let","const","varonly","change"],a:0},
    {q:"Which method selects an element by ID?",o:["document.getElementById()","document.pick()","window.id()","select.id()"],a:0}
  ],
  React:[
    {q:"React is mainly used to build:",o:["User interfaces","Database engines","Cloud networks","Operating systems"],a:0},
    {q:"Components help:",o:["Split UI into reusable pieces","Store passwords","Replace all HTML","Create databases"],a:0},
    {q:"Props are commonly used to:",o:["Pass data to components","Create SQL tables","Install Docker","Encrypt disks"],a:0}
  ],
  UIUX:[
    {q:"UX primarily focuses on:",o:["User experience","Database storage","Container images","Cloud billing"],a:0},
    {q:"A wireframe is used to:",o:["Plan interface structure","Train a model","Store data","Run SQL"],a:0},
    {q:"Usability testing identifies:",o:["User interaction problems","CPU temperature","Git branches","File types"],a:0}
  ],
  APIs:[
    {q:"An API allows:",o:["Software systems to communicate","Only CSS styling","Only image editing","Only keyboard input"],a:0},
    {q:"REST commonly uses:",o:["GET and POST","PAINT and DRAW","RUN and STOP","SAVE and PRINT"],a:0},
    {q:"JSON is commonly used for:",o:["Structured data exchange","Image painting","Video editing","Font installation"],a:0}
  ],
  Visualization:[
    {q:"A chart is used to:",o:["Communicate patterns in data","Train Docker","Compile Java","Store passwords"],a:0},
    {q:"A bar chart compares:",o:["Categories","Only coordinates","Only code files","Only audio"],a:0},
    {q:"A line chart shows:",o:["Trends over an ordered axis","Only schemas","Only UI buttons","Only certificates"],a:0}
  ],
  Communication:[
    {q:"Clear communication means:",o:["Organizing ideas so others understand them","Using more jargon","Speaking faster","Avoiding examples"],a:0},
    {q:"Examples help technical explanations by:",o:["Making concepts easier to understand","Hiding errors","Replacing evidence","Avoiding questions"],a:0},
    {q:"Good teamwork communication includes:",o:["Listening and sharing relevant information","Ignoring feedback","Avoiding updates","No coordination"],a:0}
  ],
  "Data Warehousing":[
    {q:"A data warehouse is mainly used to:",o:["Store and analyze integrated historical data","Run games","Replace all apps","Host images only"],a:0},
    {q:"A star schema commonly has:",o:["One fact table and dimension tables","Only one table","Only indexes","Only APIs"],a:0},
    {q:"Dimension tables usually store:",o:["Descriptive attributes","Only source code","Only passwords","Only logs"],a:0}
  ]
};

function startSkillAssessment(skill){
  if(Number(learningStatus[skill]||0) < 2){
    toast(`Finish learning ${skill} before taking the quiz.`);
    return;
  }
  activeQuizSkill=skill; activeQuizQuestions=quizBank[skill] || [];
  const modal=document.getElementById("assessmentModal"); const body=document.getElementById("quizBody"); const result=document.getElementById("quizResult"); const submit=document.getElementById("submitQuiz");
  document.getElementById("quizTitle").textContent=`${skill} Advanced Assessment`;document.getElementById("quizSubtitle").textContent=`You reached Advanced. Pass 70% or more to validate your ${skill} skill.`;result.hidden=true;result.className="";
  if(!activeQuizQuestions.length){body.innerHTML=`<div class="comparison-empty">No offline quiz is available for ${safeHTML(skill)}. Add this skill to the question bank later.</div>`;submit.disabled=true;modal.hidden=false;return;}
  submit.disabled=false;body.innerHTML=activeQuizQuestions.map((item,i)=>`<div class="quiz-q"><h4>${i+1}. ${safeHTML(item.q)}</h4>${item.o.map((op,j)=>`<label class="option"><input type="radio" name="quiz-${i}" value="${j}"><span>${safeHTML(op)}</span></label>`).join("")}</div>`).join("");modal.hidden=false;
}
function submitQuiz(){
  if(!activeQuizSkill || !activeQuizQuestions.length)return;
  let score=0;
  for(let i=0;i<activeQuizQuestions.length;i++){const selected=document.querySelector(`input[name="quiz-${i}"]:checked`);if(!selected){toast("Please answer every question");return;}if(Number(selected.value)===activeQuizQuestions[i].a)score++;}
  const pct=Math.round(score/activeQuizQuestions.length*100); const result=document.getElementById("quizResult"); result.hidden=false;
  if(pct>=70){const old=Number(selfRatings[activeQuizSkill]||0);const req=Number(careerData[currentRole].skills[activeQuizSkill]||3);const next=Math.max(3,Math.min(3,Math.max(old,req>=3?3:3)));selfRatings[activeQuizSkill]=next;assessmentHistory[activeQuizSkill]={score:pct,from:old,to:next,date:new Date().toISOString()}; learningStatus[activeQuizSkill]=3; saveState(); refreshAllViews(); result.className="quiz-result pass";result.innerHTML=`<strong>✅ Advanced assessment passed — ${pct}%</strong><br>${safeHTML(activeQuizSkill)} is now validated at Advanced level.`;document.getElementById("submitQuiz").disabled=true;toast(`${activeQuizSkill} Advanced level validated`);}
  else{result.className="quiz-result fail";result.innerHTML=`<strong>Keep practicing — ${pct}%</strong><br>Your skill level was not increased. Review the roadmap content and try again.`;}
}
function closeAssessment(){document.getElementById("assessmentModal").hidden=true;activeQuizSkill=null;activeQuizQuestions=[];}

/* ----------------------------
   9. GEMINI API
---------------------------- */
function hasGeminiKey(){return GEMINI_API_KEY && !GEMINI_API_KEY.includes("PASTE_YOUR");}
function extractJSON(text){const cleaned=String(text).trim().replace(/^```json/i,"").replace(/^```/i,"").replace(/```$/i,"").trim();const start=cleaned.indexOf("{");const end=cleaned.lastIndexOf("}");if(start<0||end<=start)throw new Error("AI did not return valid JSON");return JSON.parse(cleaned.slice(start,end+1));}
async function geminiRequest(parts,systemInstruction){
  if(!hasGeminiKey())throw new Error("Please add your Gemini API key in script.js first.");
  let lastError=null;
  for(const model of GEMINI_MODELS){
    for(let attempt=1;attempt<=GEMINI_RETRIES+1;attempt++){
      try{
        const url=`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
        const res=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json","x-goog-api-key":GEMINI_API_KEY},body:JSON.stringify({system_instruction:{parts:[{text:systemInstruction}]},contents:[{role:"user",parts}],generationConfig:{temperature:.2,maxOutputTokens:1000}})});
        if(res.ok){const data=await res.json();const text=data?.candidates?.[0]?.content?.parts?.map(p=>p.text||"").join("").trim();if(text)return {text,model};throw new Error("Gemini returned an empty response");}
        const raw=await res.text();lastError=new Error(`Gemini ${model} returned HTTP ${res.status}`);console.error(lastError,raw);
        if([404,429,503].includes(res.status)&&attempt<=GEMINI_RETRIES){await wait(1000*attempt);continue;}break;
      }catch(err){lastError=err;if(attempt<=GEMINI_RETRIES){await wait(1000*attempt);continue;}break;}
    }
  }
  throw lastError||new Error("Gemini request failed");
}
function wait(ms){return new Promise(resolve=>setTimeout(resolve,ms));}

/* ----------------------------
   10. AI ASSISTANT
---------------------------- */
function buildAIContext(){
  const gaps=getGaps();return {name:studentName,role:currentRole,readiness:calculateReadiness(),currentSkills:Object.entries(finalSkills()).filter(([,v])=>v>0).map(([k,v])=>`${k}: ${levelName(v)}`).join(", "),gaps:gaps.map(g=>`${g.skill} (${levelName(g.current)} → ${levelName(g.required)}, ${remainingTime(g.skill,g.difference)}, ${learningStateLabel(g.skill)})`).join(", ")||"None",roadmap:gaps.slice(0,5).map(g=>`${g.skill} [${learningStateLabel(g.skill)}]`).join(" → ")||"No remaining gap",documentEvidence:Object.keys(evidence).length?Object.entries(evidence).map(([k,v])=>`${k}: ${levelName(v.level)} (${v.source})`).join(", "):"None"};
}
function renderAIContext(){const c=buildAIContext();document.getElementById("aiContext").innerHTML=`<div class="context-item"><small>Target Career</small><strong>${safeHTML(c.role)}</strong></div><div class="context-item"><small>Readiness</small><strong>${c.readiness}%</strong></div><div class="context-item"><small>Current Skills</small><strong>${safeHTML(c.currentSkills||"None")}</strong></div><div class="context-item"><small>Skill Gaps</small><strong>${safeHTML(c.gaps)}</strong></div><div class="context-item"><small>Roadmap</small><strong>${safeHTML(c.roadmap)}</strong></div>`;}
function addChat(role,text){const root=document.getElementById("chatMessages");const box=document.createElement("div");box.className=`message ${role}`;box.innerHTML=`<b>${role==="user"?"YOU":"AI"}</b><p></p>`;box.querySelector("p").textContent=text;root.appendChild(box);root.scrollTop=root.scrollHeight;}
function usePrompt(text){document.getElementById("chatInput").value=text;document.getElementById("chatInput").focus();}
function handleChatKey(event){if(event.key==="Enter"&&!event.shiftKey){event.preventDefault();sendChat();}}
async function sendChat(){
  const input=document.getElementById("chatInput");const message=input.value.trim();if(!message)return;
  addChat("user",message);input.value="";const button=document.getElementById("sendChat");button.disabled=true;button.textContent="Thinking...";
  try{
    const c=buildAIContext();const prompt=`Student context: ${JSON.stringify(c)}. User question: ${message}. Give practical, concise career guidance. Use only the supplied student context; do not invent skills. Document evidence has been extracted locally and may be incomplete. Do not guarantee employment.`;
    const result=await geminiRequest([{text:prompt}],"You are SkillMap AI Career Assistant. Help students understand skill gaps, learning plans, projects, and assessments.");addChat("bot",result.text);
  }catch(err){console.error(err);addChat("bot",`I couldn't connect to Gemini right now. ${err.message}`);}finally{button.disabled=false;button.textContent="Send →";}
}

/* ----------------------------
   11. PROFILE / GLOBAL REFRESH
---------------------------- */
function refreshAllViews(keepCurrentPage=true){
  renderDashboard();renderAssessmentSkills();renderCareerCards();renderRoadmap();renderProjects();renderProgress();renderComparison();renderAIContext();document.getElementById("topStudentName").textContent=studentName; if(!keepCurrentPage){return;}
}
function toast(message){const t=document.getElementById("toast");t.textContent=message;t.classList.add("show");clearTimeout(window.__toastTimer);window.__toastTimer=setTimeout(()=>t.classList.remove("show"),2200);}

document.getElementById("studentName").addEventListener("input",e=>{studentName=e.target.value.trim()||"Student";saveState();document.getElementById("topStudentName").textContent=studentName;});

/* ----------------------------
   12. INITIALIZE
---------------------------- */
document.addEventListener("DOMContentLoaded",()=>{
  document.getElementById("studentName").value=studentName;
  populateCareerSelectors();
  refreshAllViews();
});
