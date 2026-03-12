import { useState, useEffect, useRef } from "react";
import { Zap, FileText, Download, Check, X, ArrowRight, Loader2, Upload, User, Mail, Lock, Eye, EyeOff, ArrowLeft, RefreshCw, Plus, Copy, AlertTriangle, ThumbsUp, TrendingUp, ThumbsDown, Share2, Coins, CreditCard, ChevronDown } from "lucide-react";

const font = `'Plus Jakarta Sans', system-ui, sans-serif`;
const mono = `'JetBrains Mono', monospace`;
const T = {
  bg: "#F8FAFC", surface: "#EFF3F8", card: "#FFF", elevated: "#E8EEF4",
  border: "#D4DEE8", accent: "#2563EB", accentSoft: "rgba(37,99,235,0.06)", accentMid: "rgba(37,99,235,0.13)",
  green: "#059669", greenSoft: "rgba(5,150,105,0.06)",
  amber: "#D97706", amberSoft: "rgba(217,119,6,0.07)",
  rose: "#DC2626", roseSoft: "rgba(220,38,38,0.06)",
  text: "#0F172A", textSec: "#475569", textMute: "#94A3B8", white: "#FFF",
};
const css = `
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes fadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
@keyframes slideUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}
input:focus,textarea:focus{border-color:#2563EB !important;box-shadow:0 0 0 3px rgba(37,99,235,0.1) !important}
button:active:not(:disabled){transform:scale(0.97)}
::selection{background:rgba(37,99,235,0.15)}
::-webkit-scrollbar{width:5px}::-webkit-scrollbar-thumb{background:#CBD5E1;border-radius:4px}
html{scroll-behavior:smooth}body{margin:0}*{box-sizing:border-box}
`;

// ─── Storage + API ───
const PFX="jp2:";
async function load(k,fb){try{const r=await window.storage.get(PFX+k);return r?JSON.parse(r.value):fb;}catch{return fb;}}
async function save(k,d){try{await window.storage.set(PFX+k,JSON.stringify(d));}catch{}}

async function callAI(sys,msg,json=false){
  try{
    const r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:4096,
        system:sys+(json?"\n\nRespond ONLY with valid JSON. No markdown, no backticks.":""),
        messages:[{role:"user",content:typeof msg==="string"?msg.substring(0,12000):msg}]})});
    if(!r.ok)return json?null:`API error (${r.status})`;
    const d=await r.json();if(d.error)return json?null:`Error: ${d.error.message}`;
    const text=(d.content||[]).map(b=>b.text||"").join("\n");
    if(!text.trim())return json?null:"Empty response.";
    if(json){try{return JSON.parse(text.replace(/```json\s?|```/g,"").trim());}catch{return null;}}
    return text;
  }catch{return json?null:"Connection error.";}
}

async function callAIDoc(sys,messages){
  try{
    const r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:4096,system:sys,messages})});
    if(!r.ok)return null;const d=await r.json();if(d.error)return null;
    const text=(d.content||[]).map(b=>b.text||"").join("\n");
    try{return JSON.parse(text.replace(/```json\s?|```/g,"").trim());}catch{return null;}
  }catch{return null;}
}

function profileSnippet(p){
  return `Name: ${p.name}\nTitle: ${p.title||""}\nExperience: ${p.experience}\nDomain: ${p.domain}\nEmail: ${p.email||""}\nPhone: ${p.phone||""}\nLocation: ${p.location||""}\nLinkedIn: ${p.linkedin||""}\nSkills: ${(p.skills||[]).slice(0,20).join(", ")}\nAchievements: ${(p.achievements||[]).slice(0,10).join(" | ")}\nSummary: ${(p.summary||"").substring(0,500)}`;
}

// ─── Shared UI ───
const inp={width:"100%",padding:"10px 14px",borderRadius:10,border:`1.5px solid ${T.border}`,background:"#FFF",color:T.text,fontSize:14,outline:"none",fontFamily:font,boxSizing:"border-box",transition:"border-color 0.2s,box-shadow 0.2s"};
const Pill=({children,color=T.accent,style:s})=><span style={{display:"inline-flex",alignItems:"center",padding:"3px 10px",borderRadius:6,fontSize:11,fontWeight:600,background:color+"14",color,...s}}>{children}</span>;
const Btn=({children,primary,small,ghost,danger,disabled,style:s,...p})=><button disabled={disabled}{...p}style={{padding:small?"7px 14px":"11px 22px",borderRadius:8,border:ghost?`1px solid ${T.border}`:"none",cursor:disabled?"not-allowed":"pointer",fontFamily:font,fontWeight:600,fontSize:small?12:13,transition:"all 0.15s",opacity:disabled?0.45:1,display:"inline-flex",alignItems:"center",gap:6,background:primary?T.accent:danger?T.roseSoft:ghost?"transparent":T.elevated,color:primary?"#FFF":danger?T.rose:T.text,...s}}>{children}</button>;
const Card=({children,style:s,glow})=><div style={{background:T.card,borderRadius:14,padding:22,border:`1px solid ${glow?T.accentMid:T.border}`,boxShadow:"0 1px 3px rgba(15,23,42,0.04)",animation:"fadeIn 0.3s ease-out",...s}}>{children}</div>;
const Label=({color=T.accent,children})=><div style={{fontSize:10,fontWeight:700,color,marginBottom:8,textTransform:"uppercase",letterSpacing:1}}>{children}</div>;
const Toast=({msg})=>msg?<div style={{position:"fixed",bottom:24,right:24,background:T.green,color:"#FFF",padding:"10px 20px",borderRadius:10,fontWeight:600,fontSize:13,display:"flex",alignItems:"center",gap:8,zIndex:1000,animation:"slideUp 0.3s",boxShadow:"0 8px 32px rgba(5,150,105,0.25)"}}><Check size={16}/>{msg}</div>:null;

// ─── Credit System ───
const CREDIT_COSTS={quickMatch:0,cvTailor:3,cvDownload:0,coverLetter:2,interviewPrep:2};
const PACKS=[
  {id:"free",name:"Free",credits:5,price:0,desc:"Try JobPilot",color:T.textMute},
  {id:"starter",name:"Starter",credits:25,price:149,desc:"For casual searching",color:T.accent,tag:"Popular"},
  {id:"pro",name:"Pro",credits:75,price:399,desc:"Serious job hunt",color:T.green},
  {id:"max",name:"Max",credits:200,price:999,desc:"All-out search mode",color:"#7C3AED",tag:"Best Value"},
];

function CreditBadge({credits}){
  return <div style={{display:"flex",alignItems:"center",gap:5,padding:"5px 12px",borderRadius:8,background:credits>0?T.accentSoft:T.roseSoft,border:`1px solid ${credits>0?T.accentMid:T.rose+"30"}`}}>
    <Coins size={13} style={{color:credits>0?T.accent:T.rose}}/><span style={{fontSize:12,fontWeight:700,color:credits>0?T.accent:T.rose,fontFamily:mono}}>{credits}</span>
    <span style={{fontSize:11,color:T.textMute}}>credits</span>
  </div>;
}

function BuyCreditsModal({show,onClose,onBuy}){
  if(!show)return null;
  return <div style={{position:"fixed",inset:0,background:"rgba(15,23,42,0.5)",backdropFilter:"blur(4px)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:24}} onClick={e=>e.target===e.currentTarget&&onClose()}>
    <div style={{background:T.card,borderRadius:16,padding:28,maxWidth:520,width:"100%",boxShadow:"0 20px 60px rgba(0,0,0,0.15)",animation:"slideUp 0.3s"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <h2 style={{fontSize:18,fontWeight:700,color:T.text,margin:0}}>Buy Credits</h2>
        <X size={18} style={{cursor:"pointer",color:T.textMute}} onClick={onClose}/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:12}}>
        {PACKS.filter(p=>p.price>0).map(p=>(
          <div key={p.id} onClick={()=>onBuy(p)} style={{padding:20,borderRadius:12,border:`2px solid ${p.tag?p.color+"40":T.border}`,cursor:"pointer",transition:"all 0.15s",position:"relative",background:p.tag?p.color+"06":"transparent"}}
            onMouseEnter={e=>e.currentTarget.style.borderColor=p.color} onMouseLeave={e=>e.currentTarget.style.borderColor=p.tag?p.color+"40":T.border}>
            {p.tag&&<div style={{position:"absolute",top:-9,right:12,padding:"2px 10px",borderRadius:10,background:p.color,color:"#FFF",fontSize:10,fontWeight:700}}>{p.tag}</div>}
            <div style={{fontSize:13,fontWeight:600,color:p.color}}>{p.name}</div>
            <div style={{display:"flex",alignItems:"baseline",gap:3,margin:"6px 0 4px"}}><span style={{fontSize:12,color:T.textMute}}>₹</span><span style={{fontSize:28,fontWeight:800,color:T.text}}>{p.price}</span></div>
            <div style={{fontSize:12,color:T.textSec,marginBottom:8}}>{p.credits} credits · ₹{(p.price/p.credits).toFixed(1)}/credit</div>
            <div style={{fontSize:12,color:T.textMute}}>{p.desc}</div>
          </div>
        ))}
      </div>
      <div style={{textAlign:"center",marginTop:16,fontSize:11,color:T.textMute}}>Credits never expire. Buy more anytime.</div>
    </div>
  </div>;
}

// ═══════════════════════════════════════
// QUICK MATCH — Free, unlimited, shareable
// ═══════════════════════════════════════
function QuickMatch({profile,credits,useCredits,onTailor}){
  const[jd,setJd]=useState("");const[loading,setLoading]=useState(false);const[result,setResult]=useState(null);
  const[error,setError]=useState("");const[history,setHistory]=useState([]);const[shared,setShared]=useState(false);

  useEffect(()=>{load("matchHistory",[]).then(setHistory);},[]);

  const score=async()=>{
    if(jd.trim().length<40){setError("Paste a longer JD.");return;}
    setError("");setLoading(true);setResult(null);setShared(false);
    const res=await callAI(`Job-fit scoring engine. Candidate:\n${profileSnippet(profile)}\n\nReturn JSON: {score(0-100),breakdown:{skills_match(0-40),experience_match(0-30),domain_relevance(0-15),keyword_overlap(0-15)},explanation(string,short recruiter-like),verdict("Strong Match"|"Good Match"|"Moderate Match"|"Weak Match"),roleTitle(string),company(string or ""),topMatches(array of 3-4),gaps(array of 2-3),recommendation(string),shouldApply(boolean)}\n\nIMPORTANT: breakdown component scores MUST sum to the overall score.`,`JD:\n\n${jd.substring(0,5000)}`,true);
    setLoading(false);
    if(res&&typeof res==="object"){
      setResult(res);
      const entry={...res,id:Date.now(),date:new Date().toISOString()};
      const updated=[entry,...history].slice(0,20);
      setHistory(updated);save("matchHistory",updated);
    }else setError("Scoring failed. Try again.");
  };

  const shareScore=()=>{
    if(!result)return;
    const text=`🎯 Just scored ${result.score}% match for "${result.roleTitle}"${result.company?` at ${result.company}`:""} using JobPilot AI!\n\n${result.topMatches?.slice(0,2).map(m=>`✅ ${m}`).join("\n")}\n\nCheck your fit score free → jobpilot.in/match`;
    navigator.clipboard?.writeText(text);
    setShared(true);setTimeout(()=>setShared(false),3000);
  };

  const scoreColor=(s)=>s>=80?T.green:s>=60?T.accent:s>=40?T.amber:T.rose;
  const verdictIcon=(v)=>v==="Strong Match"?<ThumbsUp size={16}/>:v==="Good Match"?<TrendingUp size={16}/>:v==="Moderate Match"?<AlertTriangle size={16}/>:<ThumbsDown size={16}/>;

  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
        <div>
          <h2 style={{fontSize:20,fontWeight:700,color:T.text,margin:"0 0 3px"}}>Quick Match</h2>
          <p style={{color:T.textSec,margin:0,fontSize:13}}>Free & unlimited — paste any JD, get instant fit score. Share on LinkedIn!</p>
        </div>
        <Pill color={T.green} style={{fontSize:12,padding:"4px 12px"}}>✦ Free</Pill>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <Card>
            <Label>Job Description</Label>
            <textarea value={jd} onChange={e=>setJd(e.target.value)} placeholder="Paste any job description here..." style={{...inp,minHeight:200,resize:"vertical"}}/>
            {error&&<div style={{fontSize:12,color:T.rose,marginTop:6}}>{error}</div>}
            <div style={{display:"flex",gap:8,marginTop:12}}>
              <Btn primary onClick={score} disabled={loading} style={{flex:1,justifyContent:"center"}}>
                {loading?<><Loader2 size={14} style={{animation:"spin 1s linear infinite"}}/> Scoring...</>:<><Zap size={14}/> Score Match</>}
              </Btn>
              {result&&<Btn ghost onClick={()=>{setJd("");setResult(null);}}><RefreshCw size={13}/></Btn>}
            </div>
          </Card>

          {history.length>0&&(
            <Card style={{padding:14}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                <Label color={T.textMute}>Recent ({history.length})</Label>
                <button onClick={()=>{setHistory([]);save("matchHistory",[]);}} style={{background:"none",border:"none",fontSize:10,color:T.textMute,cursor:"pointer",fontFamily:font}}>Clear</button>
              </div>
              <div style={{maxHeight:180,overflowY:"auto",display:"flex",flexDirection:"column",gap:4}}>
                {history.slice(0,8).map(h=>(
                  <div key={h.id} onClick={()=>setResult(h)} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 8px",background:T.bg,borderRadius:7,cursor:"pointer",border:`1px solid ${T.border}`}}>
                    <div style={{width:30,height:30,borderRadius:6,background:scoreColor(h.score)+"12",border:`1.5px solid ${scoreColor(h.score)}30`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,fontFamily:mono,color:scoreColor(h.score),flexShrink:0}}>{h.score}</div>
                    <div style={{flex:1,minWidth:0}}><div style={{fontSize:11,fontWeight:600,color:T.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{h.roleTitle||"Role"}{h.company?` — ${h.company}`:""}</div></div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Result */}
        <div>
          {loading?<Card style={{minHeight:380}}><div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100%",minHeight:300,gap:12}}><Loader2 size={28} style={{color:T.accent,animation:"spin 1s linear infinite"}}/><div style={{color:T.textSec,fontSize:13}}>Analyzing fit...</div></div></Card>
          :result?<Card style={{animation:"fadeIn 0.3s"}}>
            {/* Score hero */}
            <div style={{textAlign:"center",padding:"16px 0 20px",borderBottom:`1px solid ${T.border}`,marginBottom:16}}>
              <div style={{width:80,height:80,borderRadius:"50%",margin:"0 auto 10px",background:scoreColor(result.score)+"10",border:`3px solid ${scoreColor(result.score)}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,fontWeight:800,fontFamily:mono,color:scoreColor(result.score)}}>{result.score}</div>
              <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:5,color:scoreColor(result.score),fontWeight:700,fontSize:14,marginBottom:3}}>{verdictIcon(result.verdict)} {result.verdict}</div>
              {result.roleTitle&&<div style={{fontSize:13,fontWeight:600,color:T.text}}>{result.roleTitle}</div>}
              {result.company&&<div style={{fontSize:12,color:T.textSec}}>{result.company}</div>}

              {/* Share + Tailor buttons */}
              <div style={{display:"flex",gap:8,justifyContent:"center",marginTop:12}}>
                <Btn small primary onClick={()=>onTailor(jd)}><FileText size={12}/> Tailor CV (3 credits)</Btn>
                <Btn small ghost onClick={shareScore}>{shared?<><Check size={12}/> Copied!</>:<><Share2 size={12}/> Share Score</>}</Btn>
              </div>
            </div>

            {/* Score Breakdown */}
            {result.breakdown&&<div style={{marginBottom:16,padding:14,background:T.bg,borderRadius:10,border:`1px solid ${T.border}`}}>
              <Label color={T.accent}>Score Breakdown</Label>
              {[
                {label:"Skills Match",val:result.breakdown.skills_match,max:40,color:T.accent},
                {label:"Experience",val:result.breakdown.experience_match,max:30,color:T.green},
                {label:"Domain Fit",val:result.breakdown.domain_relevance,max:15,color:"#7C3AED"},
                {label:"Keywords",val:result.breakdown.keyword_overlap,max:15,color:T.amber},
              ].map(b=>(
                <div key={b.label} style={{marginBottom:8}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:3}}>
                    <span style={{fontSize:11,fontWeight:600,color:T.textSec}}>{b.label}</span>
                    <span style={{fontSize:11,fontWeight:700,color:b.color,fontFamily:mono}}>{b.val}/{b.max}</span>
                  </div>
                  <div style={{height:6,borderRadius:3,background:T.border,overflow:"hidden"}}>
                    <div style={{height:"100%",borderRadius:3,background:b.color,width:`${(b.val/b.max)*100}%`,transition:"width 0.5s ease-out"}}/>
                  </div>
                </div>
              ))}
              {result.explanation&&<div style={{fontSize:11,color:T.textMute,marginTop:8,lineHeight:1.4,fontStyle:"italic"}}>{result.explanation}</div>}
            </div>}

            {result.topMatches?.length>0&&<div style={{marginBottom:14}}><Label color={T.green}>What Matches</Label>{result.topMatches.map((m,i)=><div key={i} style={{display:"flex",alignItems:"flex-start",gap:7,padding:"5px 0"}}><Check size={13} style={{color:T.green,flexShrink:0,marginTop:2}}/><span style={{fontSize:12,color:T.textSec,lineHeight:1.5}}>{m}</span></div>)}</div>}
            {result.gaps?.length>0&&<div style={{marginBottom:14}}><Label color={T.amber}>Gaps</Label>{result.gaps.map((g,i)=><div key={i} style={{display:"flex",alignItems:"flex-start",gap:7,padding:"5px 0"}}><AlertTriangle size={13} style={{color:T.amber,flexShrink:0,marginTop:2}}/><span style={{fontSize:12,color:T.textSec,lineHeight:1.5}}>{g}</span></div>)}</div>}
            {result.recommendation&&<div style={{padding:12,background:result.shouldApply?T.greenSoft:T.amberSoft,borderRadius:8,fontSize:12,color:T.text,lineHeight:1.5,border:`1px solid ${result.shouldApply?T.green+"20":T.amber+"20"}`}}><strong style={{color:result.shouldApply?T.green:T.amber}}>{result.shouldApply?"✓ Apply":"⚠ Consider"}:</strong> {result.recommendation}</div>}
          </Card>
          :<Card style={{minHeight:380}}>
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100%",minHeight:300,gap:10}}>
              <Zap size={28} style={{color:T.textMute,opacity:0.3}}/>
              <div style={{fontSize:13,color:T.textMute,textAlign:"center",maxWidth:220}}>Paste a JD and score your fit — free, unlimited, instant</div>
            </div>
          </Card>}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════
// CV TAILOR + DOWNLOAD — Core paid feature
// ═══════════════════════════════════════
function CVTailor({profile,credits,useCredits,initialJd}){
  const[jd,setJd]=useState(initialJd||"");const[loading,setLoading]=useState(false);const[result,setResult]=useState(null);
  const[error,setError]=useState("");const[genLoading,setGenLoading]=useState(false);const[downloaded,setDownloaded]=useState(false);

  const tailor=async()=>{
    if(jd.trim().length<50){setError("Paste a complete JD.");return;}
    if(credits<3){setError("Need 3 credits. Buy more to continue.");return;}
    setError("");setLoading(true);setResult(null);setDownloaded(false);
    const res=await callAI(`ATS resume optimization expert. Analyze fit.\n\nPROFILE:\n${profileSnippet(profile)}\n\nReturn JSON: {matchScore(0-100),keywordsToAdd(array,max 8),keywordsToRemove(array,max 5),changes(array,3-5),tailoredSummary(string),topSkillsToHighlight(array of 6),warnings(array,max 3)}`,`JD:\n\n${jd.substring(0,6000)}`,true);
    setLoading(false);
    if(res&&typeof res==="object"){setResult(res);useCredits(3);}
    else setError("Analysis failed. Try shortening the JD.");
  };

  const generateCV=async()=>{
    if(!result)return;setGenLoading(true);setDownloaded(false);
    const skills=result.topSkillsToHighlight||(profile.skills||[]).slice(0,6);
    const kw=result.keywordsToAdd||[];
    const html=await callAI(`Expert ATS CV writer. Generate complete professional CV in clean HTML.\n\nCANDIDATE:\n${profileSnippet(profile)}\nTailored summary: ${result.tailoredSummary||profile.summary}\nSkills to highlight: ${skills.join(", ")}\nKeywords to add: ${kw.join(", ")}\n\nRULES:\n- Output ONLY HTML. No markdown backticks. Start with < tag.\n- Use ONLY the REAL contact details above. Never invent placeholders.\n- Font: Calibri 11pt body, 16pt name. ATS-friendly.\n- Quantify achievements with real numbers.`,`Generate tailored CV for:\n${jd.substring(0,3000)}`,false);
    setGenLoading(false);
    if(!html||html.startsWith("Error"))return;
    const clean=html.replace(/^```html?\s*/i,"").replace(/```\s*$/g,"").trim();
    const doc=`<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word'><head><meta charset="utf-8"><style>@page{size:A4;margin:2cm}body{font-family:Calibri,Arial,sans-serif;font-size:11pt;line-height:1.5;color:#222}h1{font-size:18pt;margin:0 0 4pt}h2{font-size:13pt;color:#2c5282;border-bottom:1.5pt solid #2c5282;padding-bottom:3pt;margin:14pt 0 8pt;text-transform:uppercase}p{margin:3pt 0}ul{margin:4pt 0;padding-left:20pt}li{margin:2pt 0}</style></head><body>${clean}</body></html>`;
    const blob=new Blob([doc],{type:"application/msword"});
    const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;
    a.download=`${(profile.name||"CV").replace(/\s+/g,"_")}_Tailored_CV.doc`;
    document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(url);
    setDownloaded(true);
  };

  const scoreColor=(s)=>s>=80?T.green:s>=60?T.accent:s>=40?T.amber:T.rose;

  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
        <div><h2 style={{fontSize:20,fontWeight:700,color:T.text,margin:"0 0 3px"}}>CV Tailor</h2><p style={{color:T.textSec,margin:0,fontSize:13}}>Analyze a JD, tailor your CV, download as Word doc.</p></div>
        <Pill color={T.accent}>3 credits per use</Pill>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
        <Card>
          <Label>Job Description</Label>
          <textarea value={jd} onChange={e=>setJd(e.target.value)} placeholder="Paste the full job description..." style={{...inp,minHeight:380,resize:"vertical"}}/>
          {error&&<div style={{fontSize:12,color:T.rose,marginTop:6}}>{error}</div>}
          <Btn primary onClick={tailor} disabled={loading||credits<3} style={{width:"100%",justifyContent:"center",marginTop:12}}>
            {loading?<><Loader2 size={14} style={{animation:"spin 1s linear infinite"}}/> Analyzing...</>:credits<3?<><Coins size={14}/> Need 3 credits</>:<><Zap size={14}/> Tailor My CV (3 credits)</>}
          </Btn>
        </Card>
        <Card style={{minHeight:450,maxHeight:700,overflowY:"auto"}}>
          {loading?<div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100%",minHeight:350,gap:12}}><Loader2 size={28} style={{color:T.accent,animation:"spin 1s linear infinite"}}/><div style={{color:T.textSec,fontSize:13}}>Analyzing JD...</div></div>
          :result?<div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
              <span style={{fontSize:13,fontWeight:700,color:T.text}}>Analysis</span>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <Btn small primary onClick={generateCV} disabled={genLoading}>{genLoading?<Loader2 size={11} style={{animation:"spin 1s linear infinite"}}/>:<><Download size={11}/> Download CV</>}</Btn>
                <div style={{padding:"4px 12px",borderRadius:8,fontWeight:800,fontSize:16,fontFamily:mono,background:scoreColor(result.matchScore||0)+"14",color:scoreColor(result.matchScore||0)}}>{result.matchScore||0}%</div>
              </div>
            </div>
            {[{arr:result.keywordsToAdd,label:"Add Keywords",color:T.accent,pre:"+"},{arr:result.topSkillsToHighlight,label:"Highlight",color:T.green,pre:"★"},{arr:result.keywordsToRemove,label:"Remove",color:T.rose,pre:"−"}].map(({arr,label,color,pre})=>arr?.length>0&&<div key={label} style={{marginBottom:12}}><Label color={color}>{label}</Label><div style={{display:"flex",flexWrap:"wrap",gap:4}}>{arr.map((k,i)=><Pill key={i} color={color}>{pre} {k}</Pill>)}</div></div>)}
            {result.changes?.length>0&&<div style={{marginBottom:12}}><Label color={T.amber}>Changes</Label>{result.changes.map((c,i)=><div key={i} style={{fontSize:12,color:T.textSec,padding:"5px 10px",background:T.bg,borderRadius:6,marginBottom:3,borderLeft:`2px solid ${T.amber}`}}>{c}</div>)}</div>}
            {result.tailoredSummary&&<div style={{marginBottom:12}}><Label>Tailored Summary</Label><div style={{fontSize:12,color:T.textSec,lineHeight:1.6,background:T.bg,padding:12,borderRadius:8,border:`1px solid ${T.border}`}}>{result.tailoredSummary}</div><Btn small ghost style={{marginTop:6}} onClick={()=>navigator.clipboard?.writeText(result.tailoredSummary)}><Copy size={11}/> Copy</Btn></div>}
            {downloaded&&<div style={{padding:10,background:T.greenSoft,borderRadius:8,fontSize:12,color:T.green,display:"flex",alignItems:"center",gap:6,marginTop:8}}><Check size={14}/> CV downloaded! Open in Word to review and submit.</div>}
          </div>
          :<div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100%",minHeight:350,gap:10}}><FileText size={28} style={{color:T.textMute,opacity:0.3}}/><div style={{fontSize:13,color:T.textMute,textAlign:"center"}}>Paste a JD to analyze and download your tailored CV</div></div>}
        </Card>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════
// ONBOARDING — CV Upload
// ═══════════════════════════════════════
function Onboarding({onComplete}){
  const[step,setStep]=useState(0);const[cvText,setCvText]=useState("");const[dragOver,setDragOver]=useState(false);
  const[profile,setProfile]=useState(null);const[error,setError]=useState("");const fileRef=useRef();

  const parsePrompt="Parse this CV/resume. Return JSON: name,title,experience,domain,email(or \"\"),phone(or \"\"),location(or \"\"),linkedin(or \"\"),skills(array),achievements(array,quantified),targetRoles(array of 3),summary(2-3 sentences). Extract ALL contact details.";

  const handleFile=async(file)=>{
    if(!file)return;setError("");setStep(1);
    try{
      const reader=new FileReader();
      const result=await new Promise((res,rej)=>{
        if(file.name.endsWith(".pdf")||file.type==="application/pdf"){reader.onload=()=>res({type:"pdf",data:reader.result.split(",")[1]});reader.onerror=rej;reader.readAsDataURL(file);}
        else{reader.onload=()=>res({type:"text",data:reader.result});reader.onerror=rej;reader.readAsText(file);}
      });
      let parsed;
      if(result.type==="pdf")parsed=await callAIDoc("CV parser. Respond ONLY with valid JSON.",[{role:"user",content:[{type:"document",source:{type:"base64",media_type:"application/pdf",data:result.data}},{type:"text",text:parsePrompt}]}]);
      else parsed=await callAI("CV parser. Respond ONLY with valid JSON.",`${parsePrompt}\n\n${result.data}`,true);
      if(parsed?.name){setProfile(parsed);setStep(2);}
      else{setError("Could not parse CV. Try pasting text instead.");setStep(0);}
    }catch{setError("Parse failed.");setStep(0);}
  };

  const handlePaste=async()=>{
    if(cvText.trim().length<100)return;setError("");setStep(1);
    const parsed=await callAI("CV parser. Respond ONLY with valid JSON.",`${parsePrompt}\n\n${cvText}`,true);
    if(parsed?.name){setProfile(parsed);setStep(2);}else{setError("Parse failed.");setStep(0);}
  };

  const up=(k,v)=>setProfile({...profile,[k]:v});

  if(step===1)return <div style={{minHeight:"100vh",background:T.bg,fontFamily:font,display:"flex",alignItems:"center",justifyContent:"center"}}><style>{css}</style><div style={{textAlign:"center"}}><Loader2 size={36} style={{color:T.accent,animation:"spin 1s linear infinite",marginBottom:14}}/><h2 style={{fontSize:18,fontWeight:700,color:T.text,margin:"0 0 6px"}}>Parsing Your CV</h2><p style={{fontSize:13,color:T.textSec}}>Extracting skills, achievements & contact details...</p></div></div>;

  if(step===2&&profile)return <div style={{minHeight:"100vh",background:T.bg,fontFamily:font,display:"flex",alignItems:"center",justifyContent:"center",padding:24}}><style>{css}</style>
    <div style={{width:"100%",maxWidth:560,animation:"slideUp 0.4s"}}>
      <div style={{textAlign:"center",marginBottom:20}}><div style={{width:40,height:40,borderRadius:"50%",background:T.greenSoft,display:"inline-flex",alignItems:"center",justifyContent:"center",marginBottom:10}}><Check size={20} style={{color:T.green}}/></div><h2 style={{fontSize:20,fontWeight:700,color:T.text,margin:"0 0 4px"}}>Profile Ready!</h2><p style={{fontSize:13,color:T.textSec,margin:0}}>Review and launch.</p></div>
      <Card style={{marginBottom:14,maxHeight:380,overflowY:"auto"}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:8}}><div><Label>Name</Label><input value={profile.name||""} onChange={e=>up("name",e.target.value)} style={inp}/></div><div><Label>Experience</Label><input value={profile.experience||""} onChange={e=>up("experience",e.target.value)} style={inp}/></div></div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:8}}><div><Label>Email</Label><input value={profile.email||""} onChange={e=>up("email",e.target.value)} style={inp}/></div><div><Label>Phone</Label><input value={profile.phone||""} onChange={e=>up("phone",e.target.value)} style={inp}/></div></div>
        <Label>Skills ({(profile.skills||[]).length})</Label>
        <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:12}}>{(profile.skills||[]).map((s,i)=><Pill key={i} color={T.accent} style={{gap:4}}>{s}<span onClick={()=>up("skills",profile.skills.filter((_,j)=>j!==i))} style={{cursor:"pointer",opacity:0.5}}>×</span></Pill>)}</div>
      </Card>
      <Btn primary onClick={async()=>{await save("profile",profile);onComplete(profile);}} style={{width:"100%",justifyContent:"center",padding:"14px",fontSize:15,borderRadius:10}}>Launch JobPilot <ArrowRight size={16}/></Btn>
    </div>
  </div>;

  return <div style={{minHeight:"100vh",background:T.bg,fontFamily:font,display:"flex",alignItems:"center",justifyContent:"center",padding:24}}><style>{css}</style>
    <div style={{width:"100%",maxWidth:520,animation:"slideUp 0.5s"}}>
      <div style={{display:"flex",alignItems:"center",gap:10,justifyContent:"center",marginBottom:28}}>
        <div style={{width:38,height:38,borderRadius:10,background:"linear-gradient(135deg,#2563EB,#7C3AED)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontWeight:800,color:"#FFF"}}>J</div>
        <div><div style={{fontSize:20,fontWeight:700,color:T.text}}>JobPilot</div><div style={{fontSize:9,color:T.accent,fontWeight:600,letterSpacing:2,textTransform:"uppercase"}}>Setup</div></div>
      </div>
      <div style={{textAlign:"center",marginBottom:24}}><h1 style={{fontSize:22,fontWeight:700,color:T.text,margin:"0 0 6px"}}>Upload Your CV</h1><p style={{fontSize:14,color:T.textSec,margin:0}}>AI extracts everything. You'll get <strong>5 free credits</strong> to start.</p></div>
      <Card>
        <div onDragOver={e=>{e.preventDefault();setDragOver(true);}} onDragLeave={()=>setDragOver(false)} onDrop={e=>{e.preventDefault();setDragOver(false);handleFile(e.dataTransfer?.files?.[0]);}} onClick={()=>fileRef.current?.click()} style={{border:`2px dashed ${dragOver?T.accent:T.border}`,borderRadius:12,padding:"36px 20px",textAlign:"center",cursor:"pointer",background:dragOver?T.accentSoft:"transparent",transition:"all 0.2s",marginBottom:14}}>
          <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.txt" style={{display:"none"}} onChange={e=>handleFile(e.target.files?.[0])}/>
          <Upload size={26} style={{color:T.textMute,marginBottom:8}}/><div style={{fontSize:14,fontWeight:600,color:T.text,marginBottom:3}}>Drag & drop your CV</div><div style={{fontSize:12,color:T.textMute}}>PDF, Word, or Text</div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}><div style={{flex:1,height:1,background:T.border}}/><span style={{fontSize:10,color:T.textMute}}>OR PASTE</span><div style={{flex:1,height:1,background:T.border}}/></div>
        <textarea value={cvText} onChange={e=>setCvText(e.target.value)} placeholder="Paste CV text here..." style={{...inp,minHeight:100,resize:"vertical",marginBottom:12}}/>
        <Btn primary onClick={handlePaste} disabled={cvText.trim().length<100} style={{width:"100%",justifyContent:"center"}}>Parse CV <ArrowRight size={14}/></Btn>
        {error&&<div style={{marginTop:10,padding:8,background:T.roseSoft,borderRadius:8,fontSize:12,color:T.rose}}>{error}</div>}
      </Card>
    </div>
  </div>;
}

// ═══════════════════════════════════════
// MAIN APP — Focused 3-feature MVP
// ═══════════════════════════════════════
const TABS=[{name:"Quick Match",Icon:Zap,free:true},{name:"CV Tailor",Icon:FileText}];

export default function App(){
  const[profile,setProfile]=useState(null);const[credits,setCredits]=useState(5);
  const[loading,setLoading]=useState(true);const[tab,setTab]=useState(0);const[hover,setHover]=useState(-1);
  const[showBuy,setShowBuy]=useState(false);const[toast,setToast]=useState("");
  const[tailorJd,setTailorJd]=useState("");

  useEffect(()=>{
    Promise.all([load("profile",null),load("credits",5)]).then(([p,c])=>{
      if(p?.name)setProfile(p);
      setCredits(c);setLoading(false);
    });
  },[]);

  const useCredits=(n)=>{const nc=Math.max(0,credits-n);setCredits(nc);save("credits",nc);};
  const buyPack=(pack)=>{const nc=credits+pack.credits;setCredits(nc);save("credits",nc);setShowBuy(false);setToast(`${pack.credits} credits added!`);setTimeout(()=>setToast(""),2500);};
  const handleTailor=(jd)=>{setTailorJd(jd);setTab(1);};

  if(loading)return <div style={{minHeight:"100vh",background:T.bg,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:font}}><style>{css}</style><Loader2 size={28} style={{color:T.accent,animation:"spin 1s linear infinite"}}/></div>;
  if(!profile)return <Onboarding onComplete={(p)=>{setProfile(p);setCredits(5);save("credits",5);}}/>;

  return(
    <div style={{display:"flex",minHeight:"100vh",background:T.bg,fontFamily:font,color:T.text}}>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet"/>
      <style>{css}</style>

      {/* Sidebar */}
      <div style={{width:200,background:T.surface,borderRight:`1px solid ${T.border}`,display:"flex",flexDirection:"column",flexShrink:0}}>
        <div style={{padding:"16px 14px",borderBottom:`1px solid ${T.border}`}}>
          <div style={{display:"flex",alignItems:"center",gap:9}}>
            <div style={{width:30,height:30,borderRadius:8,background:"linear-gradient(135deg,#2563EB,#7C3AED)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:800,color:"#FFF"}}>J</div>
            <div><div style={{fontSize:15,fontWeight:700}}>JobPilot</div><div style={{fontSize:8,color:T.accent,fontWeight:600,letterSpacing:1.5,textTransform:"uppercase"}}>AI Engine</div></div>
          </div>
        </div>
        <nav style={{padding:"10px 8px",flex:1}}>
          {TABS.map((t,i)=>{const Icon=t.Icon;return(
            <div key={t.name} onClick={()=>setTab(i)} onMouseEnter={()=>setHover(i)} onMouseLeave={()=>setHover(-1)} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 12px",borderRadius:8,cursor:"pointer",marginBottom:2,transition:"all 0.15s",background:tab===i?T.accentSoft:hover===i?T.elevated:"transparent",color:tab===i?T.accent:T.textSec}}>
              <div style={{display:"flex",alignItems:"center",gap:9}}><Icon size={14} strokeWidth={tab===i?2.2:1.6}/><span style={{fontSize:12,fontWeight:tab===i?600:400}}>{t.name}</span></div>
              {t.free&&<span style={{fontSize:8,fontWeight:700,color:T.green,textTransform:"uppercase"}}>Free</span>}
            </div>
          );})}
        </nav>

        {/* Credits */}
        <div style={{padding:"10px 12px",borderTop:`1px solid ${T.border}`}}>
          <div onClick={()=>setShowBuy(true)} style={{padding:12,background:T.card,borderRadius:9,border:`1px solid ${T.border}`,cursor:"pointer",transition:"border-color 0.15s"}} onMouseEnter={e=>e.currentTarget.style.borderColor=T.accent} onMouseLeave={e=>e.currentTarget.style.borderColor=T.border}>
            <CreditBadge credits={credits}/>
            <div style={{marginTop:6,fontSize:10,color:T.accent,fontWeight:600,display:"flex",alignItems:"center",gap:3}}><Plus size={10}/> Buy Credits</div>
          </div>
        </div>

        {/* Profile */}
        <div style={{padding:"8px 12px 12px"}}>
          <div style={{fontSize:11,fontWeight:600,color:T.text}}>{profile.name}</div>
          <div style={{fontSize:9,color:T.textMute}}>{profile.experience} · {(profile.domain||"").split(",")[0]}</div>
        </div>
      </div>

      {/* Main */}
      <div style={{flex:1,padding:22,overflowY:"auto",maxHeight:"100vh"}}>
        {tab===0&&<QuickMatch profile={profile} credits={credits} useCredits={useCredits} onTailor={handleTailor}/>}
        {tab===1&&<CVTailor profile={profile} credits={credits} useCredits={useCredits} initialJd={tailorJd}/>}
      </div>

      <BuyCreditsModal show={showBuy} onClose={()=>setShowBuy(false)} onBuy={buyPack}/>
      <Toast msg={toast}/>
    </div>
  );
}
