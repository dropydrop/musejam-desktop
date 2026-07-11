// @ts-nocheck
import './styles.css';
import { midi } from './midi-manager.ts';

// ─── CONSTANTS ───────────────────────────────────────────────────────────────
const RES_OPTIONS  = [1, 2, 4];
const RES_TO_CELLS = { 1:4, 2:8, 4:16 };
const RES_LABELS   = { 1:'1t', 2:'2t', 4:'4t' };

const PATTERNS = {
  4:{
    doux:[[1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0],[1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0],[1,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0],[1,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0],[0,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0],[1,0,0,0,1,0,0,0,1,0,0,0,0,0,0,0]],
    medium:[[1,0,0,0,1,0,0,0,1,0,0,0,0,0,1,0],[1,0,0,0,1,0,0,0,0,0,1,0,1,0,0,0],[1,0,0,0,0,0,1,0,1,0,0,0,1,0,0,0],[1,0,0,0,1,0,1,0,0,0,0,0,1,0,0,0],[1,0,0,0,1,0,0,0,1,0,0,0,1,0,1,0],[1,0,0,0,1,0,0,0,1,0,1,0,0,0,0,0]],
    spicy:[[1,0,1,0,0,0,1,0,0,0,0,0,1,0,0,0],[1,0,0,0,0,0,1,0,1,0,1,0,0,0,1,0],[1,0,0,0,1,0,0,0,0,0,1,0,0,0,1,0],[1,0,1,0,0,0,0,0,1,0,1,0,1,0,0,0],[1,0,1,0,0,0,1,0,0,0,0,0,1,0,0,0]],
  },
  2:{
    doux:[[1,0,0,0,1,0,0,0],[1,0,0,0,0,0,0,0],[0,0,0,0,1,0,0,0],[1,0,0,0,1,0,1,0]],
    medium:[[1,0,0,0,0,0,1,0],[1,0,1,0,0,0,0,0],[1,0,0,0,1,0,0,0],[0,0,1,0,1,0,0,0],[1,0,0,0,0,0,1,0]],
    spicy:[[1,0,1,0,0,0,1,0],[0,0,1,0,1,0,1,0],[1,0,1,0,1,0,0,0],[1,0,0,0,1,0,1,0]],
  },
  1:{
    doux:[[1,0,0,0],[1,0,0,0],[0,0,1,0],[1,0,1,0]],
    medium:[[1,0,0,0],[0,0,1,0],[1,0,1,0],[1,0,0,0]],
    spicy:[[1,0,1,0],[0,0,1,0],[1,0,0,0],[1,0,1,0]],
  }
};
function getRandPattern(res,diff){const p=PATTERNS[res][diff];return[...p[Math.floor(Math.random()*p.length)]];}

function patternToLabel(p,res){
  return Array.from({length:res},(_,g)=>{
    const b=g*4,grp=p.slice(b,b+4);
    if(grp[0]===1&&grp[1]===0&&grp[2]===0&&grp[3]===0)return'♩';
    if(grp[0]===0&&grp[2]===0)return'—';
    if(grp[0]===1&&grp[2]===1)return'♪♪';
    if(grp[0]===0&&grp[2]===1)return'·♪';
    if(grp[0]===1&&grp[2]===0)return'♩·';
    return'≈';
  }).join('  ');
}

// ─── STATE ───────────────────────────────────────────────────────────────────
let sessionCounter=1,bpm=75,isPlaying=false,metronomeOn=true,editMode=false,lastMesureIdx=-1;
let audioCtx=null,nextBeatTime=0,currentCell=0,totalCells=0;
let schedulerTimer=null,scheduledBeats=[],lastRenderedCell=-1,rafId=null;
let currentData=null,history=[];
let lockedSlots=Array(8).fill(null);
let lockedPatterns=Array(8).fill(null);
let resolutions=Array(8).fill(4);

// ─── MUSETHESIA STATE ─────────────────────────────────────────────────────────
let museThesiaActive=false,museThesiaRaf=null,museThesiaEvents=[],museThesiaLoopDur=0;

// ─── CHORD / MUSIC DATA ──────────────────────────────────────────────────────
const ALL_CHORDS=["Am","G","Em","F","C","Dm","Am7","Fmaj7","Gsus4","Em7","Dm7","G7"];
const ACCORDS_FR={"Am":"LAm","G":"SOL","Em":"MIm","F":"FA","C":"DO","Dm":"RÉm","Am7":"LAm7","Fmaj7":"FAmaj7","Gsus4":"SOLsus4","Em7":"MIm7","Dm7":"RÉm7","G7":"SOL7"};
const NOTES_ACC={"Am":["La","Do","Mi"],"G":["Sol","Si","Ré"],"Em":["Mi","Sol","Si"],"F":["Fa","La","Do"],"C":["Do","Mi","Sol"],"Dm":["Ré","Fa","La"],"Am7":["La","Do","Mi","Sol"],"Fmaj7":["Fa","La","Do","Mi"],"Gsus4":["Sol","Do","Ré"],"Em7":["Mi","Sol","Si","Ré"],"Dm7":["Ré","Fa","La","Do"],"G7":["Sol","Si","Ré","Fa"]};
const NOTE_FREQ={"Do":261.63,"Do#":277.18,"Ré":293.66,"Ré#":311.13,"Mi":329.63,"Fa":349.23,"Fa#":369.99,"Sol":392.00,"Sol#":415.30,"La":440.00,"La#":466.16,"Si":493.88};
const CONTRAINTES={
  doux:["Notes : La · Do · Mi · Sol — pentatonique seulement","Commence chaque mesure sur La ou Mi","Mouvement conjoint uniquement — pas de saut","Termine sur La ou Do à la fin de la boucle","Une note par temps — pas de croches pour l'instant"],
  medium:["Notes : Mi · Sol · La · Si · Do · Ré","Commence par la tonique de chaque accord","Maximum un saut par mesure (tierce ou quarte)","Évite de répéter deux fois de suite la même note","Termine chaque mesure sur une note de l'accord actif","Essaie une note de passage entre deux notes éloignées","Varie les nuances : au moins un changement de dynamique"],
  spicy:["Toutes les notes de la gamme disponibles","Syncope obligatoire sur le 2e ou 4e temps","Octaves à la main droite sur les temps forts","Saut + retour conjoint dans chaque mesure","Monte en tessiture sur la 1e moitié, redescends sur la 2e","Ajoute une broderie (note voisine aller-retour rapide)","Explore le Si bémol pour une couleur blues"]
};
const DEFIS={
  doux:["Joue pianissimo — comme si tu ne voulais pas réveiller quelqu'un","Garde les yeux fermés pendant toute la session","Reste dans une seule octave","Chaque note dure exactement un temps, ni plus ni moins","Ta mélodie doit terminer sur La"],
  medium:["Trille léger sur le 3e temps de chaque mesure","Alterner fort/doux entre mesures paires et impaires","Glissando doux juste avant chaque changement d'accord","Finir à l'unisson avec la main gauche sur le dernier temps","Répète un motif de 2 notes et fais-le évoluer","Joue uniquement sur les contretemps"],
  spicy:["Trille + syncope sur chaque mesure","Main droite en octaves, main gauche basses","Crée une variation mélodique différente pour chaque accord","Motif de 3 notes rapides en anacrouse avant chaque accord","Crescendo puis diminuendo en reprenant"]
};
const PROGRESSIONS_AM=[["Am","G","F","G"],["Am","F","C","G"],["Am","Em","F","G"],["Am","C","G","Am"],["Am","Dm","G","Am"],["Em","F","G","Am"],["Am","G","Am","F"],["Am","Am7","F","G"],["Am","Em","Dm","G"],["Am","F","G","Em"],["Dm","G","Am","Em"],["Am","Fmaj7","G","Em7"],["Am","Dm","Em","Am"],["Am","G","F","Em"]];
const PROGRESSIONS_C=[["C","G","Am","F"],["C","Am","F","G"],["C","F","G","Am"],["C","G","F","C"],["C","Am","G","F"],["C","F","C","G"],["C","Em","F","G"],["C","Dm","G","C"],["C","G","Am","Em"],["C","Fmaj7","G","Em7"],["C","Am","Dm","G"]];
function getRandom(arr){return arr[Math.floor(Math.random()*arr.length)];}

function totalBeats(){if(!currentData)return 0;return Array.from({length:currentData.nbMesures},(_,i)=>resolutions[i]).reduce((a,b)=>a+b,0);}
function isValidTotal(){const t=totalBeats();return t>0&&t%2===0;}

function updateTotalBadge(){
  const el=document.getElementById('totalBadge');if(!el)return;
  const t=totalBeats(),valid=t>0&&t%2===0;
  el.textContent=`${t}t${valid?' ✓':' ⚠'}`;
  el.className='total-badge '+(valid?'ok':'warn');
  for(const id of['playBtn','playBtnTop']){
    const pb=document.getElementById(id);
    if(pb&&!isPlaying)pb.classList.toggle('blocked',!valid);
  }
}

function genererCarte(regenRhythmsOnly=false){
  const tonality=document.getElementById('tonality').value;
  const diff=document.getElementById('difficulty').value;
  const nbMesures=parseInt(document.getElementById('mesures').value);
  const base=getRandom(tonality==='Am'?PROGRESSIONS_AM:PROGRESSIONS_C);
  const progression=Array.from({length:nbMesures},(_,i)=>lockedSlots[i]!==null?lockedSlots[i]:base[i%base.length]);
  const patterns=Array.from({length:nbMesures},(_,i)=>lockedPatterns[i]!==null?[...lockedPatterns[i]]:getRandPattern(resolutions[i],diff));
  const cp=CONTRAINTES[diff];const contraintes=[];const nb=diff==='doux'?3:diff==='medium'?4:5;
  while(contraintes.length<nb){const c=getRandom(cp);if(!contraintes.includes(c))contraintes.push(c);}
  return{tonality,progression,patterns,contraintes,defi:getRandom(DEFIS[diff]),diff,nbMesures};
}

// ─── RESOLUTION ──────────────────────────────────────────────────────────────
function setResolution(slotIdx,newRes){
  if(isPlaying)return;
  resolutions[slotIdx]=newRes;
  const diff=currentData?currentData.diff:document.getElementById('difficulty').value;
  if(lockedPatterns[slotIdx]!==null){
    const newLen=RES_TO_CELLS[newRes],old=lockedPatterns[slotIdx];
    lockedPatterns[slotIdx]=old.length>=newLen?old.slice(0,newLen):[...old,...Array(newLen-old.length).fill(0)];
    currentData.patterns[slotIdx]=[...lockedPatterns[slotIdx]];
  } else {
    currentData.patterns[slotIdx]=getRandPattern(newRes,diff);
  }
  refreshBlockDOM(slotIdx);
  updateTotalBadge();
}

function refreshBlockDOM(i){
  const data=currentData,acc=data.progression[i],pattern=data.patterns[i],res=resolutions[i];
  const resBtnsHTML=RES_OPTIONS.map(r=>{
    const testTotal=Array.from({length:data.nbMesures},(_,j)=>j===i?r:resolutions[j]).reduce((a,b)=>a+b,0);
    const wouldWarn=testTotal%2!==0;
    return`<button class="res-btn${r===res?' active':''}${r!==res&&wouldWarn?' warn':''}" data-slot="${i}" data-res="${r}">${RES_LABELS[r]}</button>`;
  }).join('');
  const ri=document.querySelector(`#block-${i} .res-inline`);
  if(ri)ri.innerHTML=`<span class="res-lbl">Dur.</span>${resBtnsHTML}`;
  let numRow='',groupsHTML='';
  for(let g=0;g<res;g++){
    numRow+=`<div style="flex:1;display:flex;">`+[0,1,2,3].map(s=>`<div class="beat-num-cell ${s===0?'strong':''}" style="${s===2?'opacity:0.5':''}">${s===0?(g+1):(s===2?'+':'')}</div>`).join('')+`</div>`;
    groupsHTML+=`<div class="beat-group">`;
    for(let s=0;s<4;s++){const idx=g*4+s;groupsHTML+=`<div class="beat ${pattern[idx]===1?'on':'rest'}" data-mesure="${i}" data-beat="${idx}"></div>`;}
    groupsHTML+=`</div>`;
  }
  const bn=document.querySelector(`#block-${i} .beat-nums`);if(bn)bn.innerHTML=numRow;
  const sq=document.getElementById(`seq-${i}`);if(sq)sq.innerHTML=groupsHTML;
  const lbl=document.getElementById(`rlabel-${i}`);if(lbl)lbl.textContent=patternToLabel(pattern,res);
  totalCells=Array.from({length:data.nbMesures},(_,j)=>RES_TO_CELLS[resolutions[j]]).reduce((a,b)=>a+b,0);
}

// ─── PIANO ───────────────────────────────────────────────────────────────────
const WHITE_NOTES=['Do','Ré','Mi','Fa','Sol','La','Si','Do','Ré','Mi','Fa','Sol','La','Si'];
const BLACK_SLOTS=[0,1,3,4,5,7,8,10,11,12];
function renderPiano(lit){
  const wPct=100/14;
  return`<div class="keyboard-wrap"><div class="white-keys">${WHITE_NOTES.map(n=>`<div class="wkey ${lit.includes(n)?'lit-grey':''}"><span class="wkey-label">${n}</span></div>`).join('')}</div><div class="black-keys">${BLACK_SLOTS.map(s=>`<div class="bkey" style="left:${(s+1)*wPct-wPct*0.3}%;width:${wPct*0.6}%;"></div>`).join('')}</div></div>`;
}

function updatePianoChord(notes){
  document.querySelectorAll('.wkey').forEach((el,i)=>{
    el.classList.remove('lit-flash');
    el.classList.toggle('lit-grey', notes.includes(WHITE_NOTES[i]));
  });
}

let pianoFlashTimeout=null;
function flashPiano(notes){
  if(pianoFlashTimeout){clearTimeout(pianoFlashTimeout);pianoFlashTimeout=null;}
  document.querySelectorAll('.wkey').forEach((el,i)=>{
    const isChordNote=notes.includes(WHITE_NOTES[i]);
    el.classList.toggle('lit-flash', isChordNote);
    el.classList.toggle('lit-grey',  false);
  });
  const twoCell=(60/bpm/4)*2*1000;
  pianoFlashTimeout=setTimeout(()=>{
    document.querySelectorAll('.wkey').forEach((el,i)=>{
      el.classList.remove('lit-flash');
      el.classList.toggle('lit-grey', notes.includes(WHITE_NOTES[i]));
    });
    pianoFlashTimeout=null;
  }, twoCell);
}

function updatePianoLit(notes){
  if(pianoFlashTimeout){clearTimeout(pianoFlashTimeout);pianoFlashTimeout=null;}
  document.querySelectorAll('.wkey').forEach((el,i)=>{
    el.classList.remove('lit-flash');
    el.classList.toggle('lit-grey', notes.includes(WHITE_NOTES[i]));
  });
}

// ─── AUDIO ───────────────────────────────────────────────────────────────────
function getCtx(){if(!audioCtx)audioCtx=new(window.AudioContext||window.webkitAudioContext)();return audioCtx;}
function playClick(time,strong){
  const ctx=getCtx();
  const buf=ctx.createBuffer(1,ctx.sampleRate*0.04,ctx.sampleRate);
  const d=buf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/d.length,8);
  const noise=ctx.createBufferSource();noise.buffer=buf;
  const ng=ctx.createGain();ng.gain.setValueAtTime(strong?0.55:0.22,time);ng.gain.exponentialRampToValueAtTime(0.001,time+0.04);
  noise.connect(ng);ng.connect(ctx.destination);noise.start(time);noise.stop(time+0.05);
  const osc=ctx.createOscillator();const og=ctx.createGain();
  osc.type='sine';osc.frequency.setValueAtTime(strong?1000:700,time);osc.frequency.exponentialRampToValueAtTime(strong?600:400,time+0.03);
  og.gain.setValueAtTime(strong?0.38:0.16,time);og.gain.exponentialRampToValueAtTime(0.001,time+0.03);
  osc.connect(og);og.connect(ctx.destination);osc.start(time);osc.stop(time+0.04);
}

function noteToFreq(noteName){
  return NOTE_FREQ[noteName]||0;
}
function playChordNotes(chordName,velocity){
  const ctx=getCtx(),notes=NOTES_ACC[chordName];
  if(!notes)return;const now=ctx.currentTime,duration=0.15,gain=0.3;
  notes.forEach(n=>{
    const freq=noteToFreq(n);if(!freq)return;
    const osc=ctx.createOscillator(),gn=ctx.createGain();
    osc.type='triangle';osc.frequency.setValueAtTime(freq,now);
    gn.gain.setValueAtTime(gain,now);gn.gain.exponentialRampToValueAtTime(0.001,now+duration);
    osc.connect(gn);gn.connect(ctx.destination);osc.start(now);osc.stop(now+duration+0.01);
  });
}

let cellMap=[];
function buildCellMap(){
  if(!currentData)return[];
  const map=[];
  for(let mi=0;mi<currentData.nbMesures;mi++){
    const cells=RES_TO_CELLS[resolutions[mi]];
    for(let c=0;c<cells;c++){map.push({mesureIdx:mi,localCell:c,isFirstCellOfBeat:c%4===0,beatNumInMesure:Math.floor(c/4),isFirstBeatOfMesure:c===0});}
  }
  return map;
}
function scheduler(){
  const ctx=getCtx();
  while(nextBeatTime<ctx.currentTime+0.12){
    const entry=cellMap[currentCell%cellMap.length];
    if(entry.isFirstCellOfBeat&&metronomeOn)playClick(nextBeatTime,entry.isFirstBeatOfMesure);
    scheduledBeats.push({time:nextBeatTime,cellIdx:currentCell%cellMap.length});
    nextBeatTime+=60/bpm/4;
    currentCell=(currentCell+1)%cellMap.length;
  }
}
function startScheduler(){
  if(!isValidTotal())return;
  cellMap=buildCellMap();
  const ctx=getCtx();if(ctx.state==='suspended')ctx.resume();
  currentCell=0;nextBeatTime=ctx.currentTime+0.05;
  scheduledBeats=[];lastRenderedCell=-1;
  schedulerTimer=setInterval(scheduler,25);
  rafId=requestAnimationFrame(drawLoop);
  if(museThesiaActive)startMusesthesia();
}
function stopScheduler(){
  clearInterval(schedulerTimer);schedulerTimer=null;
  cancelAnimationFrame(rafId);rafId=null;
  scheduledBeats=[];lastRenderedCell=-1;lastMesureIdx=-1;
  clearVisual();
  if(museThesiaActive)stopMusesthesia();
}
function drawLoop(){
  const ctx=getCtx(),now=ctx.currentTime;
  let active=lastRenderedCell;
  for(const b of scheduledBeats){if(b.time<=now)active=b.cellIdx;}
  scheduledBeats=scheduledBeats.filter(b=>b.time>now-0.1);
  if(active!==lastRenderedCell){lastRenderedCell=active;updateVisual(active);}
  if(isPlaying)rafId=requestAnimationFrame(drawLoop);
}
function clearVisual(){
  document.querySelectorAll('.beat').forEach(b=>b.classList.remove('active-cursor'));
  document.querySelectorAll('.accord-block').forEach(b=>b.classList.remove('active-mesure'));
  const c=document.getElementById('beatCounter');
  if(c)c.innerHTML='<span>1</span> · <span>2</span> · <span>3</span> · <span>4</span>';
  updatePianoLit([]);
}
function updateVisual(cellIdx){
  if(!currentData||!cellMap.length)return;
  const entry=cellMap[cellIdx],mi=entry.mesureIdx,lc=entry.localCell,qNum=entry.beatNumInMesure,res=resolutions[mi];
  const chordNotes=NOTES_ACC[currentData.progression[mi]]||[];

  if(mi!==lastMesureIdx){
    updatePianoChord(chordNotes);
    lastMesureIdx=mi;
  }

  document.querySelectorAll('.accord-block').forEach((b,i)=>b.classList.toggle('active-mesure',i===mi));
  document.querySelectorAll('.beat').forEach(b=>b.classList.remove('active-cursor'));
  const seq=document.getElementById(`seq-${mi}`);
  let isActiveBeat=false;
  if(seq){
    const beats=seq.querySelectorAll('.beat');
    if(beats[lc]){
      beats[lc].classList.add('active-cursor');
      isActiveBeat=beats[lc].classList.contains('on');
    }
  }
  const c=document.getElementById('beatCounter');
  if(c){c.innerHTML=Array.from({length:res},(_,i)=>`<span style="color:${i===qNum?(i===0?'var(--accent2)':'var(--text)'):'var(--muted)'}">${i+1}</span>`).join(' · ');}

  if(isActiveBeat){
    flashPiano(chordNotes);
    playChordNotes(currentData.progression[mi],0.8);
  }
}

// ─── EDIT MODE ───────────────────────────────────────────────────────────────
function enterEditMode(){if(isPlaying)return;editMode=true;document.body.classList.add('edit-mode');const b=document.getElementById('editBtnGlobal');if(b)b.classList.add('on');}
function exitEditMode(){editMode=false;document.body.classList.remove('edit-mode');const b=document.getElementById('editBtnGlobal');if(b)b.classList.remove('on');}
function toggleEditMode(){editMode?exitEditMode():enterEditMode();}
function toggleBeat(mi,bi){
  if(!editMode||isPlaying)return;
  const p=currentData.patterns[mi];p[bi]=p[bi]===1?0:1;
  const seq=document.getElementById(`seq-${mi}`);
  if(seq){const cells=seq.querySelectorAll('.beat');if(cells[bi]){cells[bi].classList.toggle('on',p[bi]===1);cells[bi].classList.toggle('rest',p[bi]===0);}}
  const lbl=document.getElementById(`rlabel-${mi}`);if(lbl)lbl.textContent=patternToLabel(p,resolutions[mi]);
  if(lockedPatterns[mi]!==null)lockedPatterns[mi]=[...p];
}

// ─── LOCKS ───────────────────────────────────────────────────────────────────
function toggleChordLock(i){lockedSlots[i]=lockedSlots[i]!==null?null:currentData.progression[i];refreshChordLockUI(i);refreshLockAllChordsBtn();}
function refreshChordLockUI(i){
  const block=document.getElementById(`block-${i}`),btn=document.getElementById(`chord-lock-btn-${i}`);
  if(!block||!btn)return;
  const locked=lockedSlots[i]!==null;
  block.classList.toggle('chord-locked',locked);btn.classList.toggle('locked',locked);
  btn.textContent=locked?'🔒':'🔓';
}
function refreshLockAllChordsBtn(){
  const n=currentData?currentData.nbMesures:4;
  const all=Array.from({length:n},(_,i)=>lockedSlots[i]!==null).every(Boolean);
  const btn=document.getElementById('lockAllChordsBtn');
  if(btn){btn.classList.toggle('all-locked',all);btn.textContent=all?'🔒 Accords':'🔓 Accords';}
}
function toggleLockAllChords(){
  const n=currentData?currentData.nbMesures:4;
  const all=Array.from({length:n},(_,i)=>lockedSlots[i]!==null).every(Boolean);
  for(let i=0;i<n;i++)lockedSlots[i]=all?null:currentData.progression[i];
  for(let i=0;i<n;i++)refreshChordLockUI(i);
  refreshLockAllChordsBtn();
}

function toggleRythmLock(i){lockedPatterns[i]=lockedPatterns[i]!==null?null:[...currentData.patterns[i]];refreshRythmLockUI(i);refreshLockAllRythmsBtn();}
function refreshRythmLockUI(i){
  const block=document.getElementById(`block-${i}`),btn=document.getElementById(`rythm-lock-btn-${i}`);
  if(!block||!btn)return;
  const locked=lockedPatterns[i]!==null;
  block.classList.toggle('rythm-locked',locked);btn.classList.toggle('locked',locked);
  btn.textContent=locked?'🎵':'🎶';
}
function refreshLockAllRythmsBtn(){
  const n=currentData?currentData.nbMesures:4;
  const all=Array.from({length:n},(_,i)=>lockedPatterns[i]!==null).every(Boolean);
  const btn=document.getElementById('lockAllRythmsBtn');
  if(btn){btn.classList.toggle('all-locked',all);btn.textContent=all?'🎵 Rythmes':'🎶 Rythmes';}
}
function toggleLockAllRythms(){
  const n=currentData?currentData.nbMesures:4;
  const all=Array.from({length:n},(_,i)=>lockedPatterns[i]!==null).every(Boolean);
  for(let i=0;i<n;i++)lockedPatterns[i]=all?null:[...currentData.patterns[i]];
  for(let i=0;i<n;i++)refreshRythmLockUI(i);
  refreshLockAllRythmsBtn();
}

// ─── PICKER ──────────────────────────────────────────────────────────────────
let openPickerIdx=-1;
function togglePicker(i){if(openPickerIdx===i){closePicker();return;}if(openPickerIdx>=0)closePicker();openPickerIdx=i;document.getElementById(`picker-${i}`).classList.add('open');const eb=document.getElementById(`edit-chord-btn-${i}`);if(eb){eb.style.borderColor='var(--accent)';eb.style.color='var(--accent)';}}
function closePicker(){if(openPickerIdx<0)return;document.getElementById(`picker-${openPickerIdx}`)?.classList.remove('open');const eb=document.getElementById(`edit-chord-btn-${openPickerIdx}`);if(eb){eb.style.borderColor='';eb.style.color='';}openPickerIdx=-1;}
function pickChord(slotIdx,chordKey){
  currentData.progression[slotIdx]=chordKey;lockedSlots[slotIdx]=chordKey;
  document.getElementById(`acc-name-${slotIdx}`).textContent=ACCORDS_FR[chordKey]||chordKey;
  document.getElementById(`acc-notes-${slotIdx}`).textContent=(NOTES_ACC[chordKey]||[]).join(' · ');
  document.querySelectorAll(`#picker-${slotIdx} .pick-btn`).forEach(b=>b.classList.toggle('selected',b.dataset.chord===chordKey));
  refreshChordLockUI(slotIdx);refreshLockAllChordsBtn();closePicker();
}

// ─── RENDER ──────────────────────────────────────────────────────────────────
function renderCard(data){
  stopScheduler();isPlaying=false;exitEditMode();currentData=data;
  const num=sessionCounter++;
  totalCells=Array.from({length:data.nbMesures},(_,i)=>RES_TO_CELLS[resolutions[i]]).reduce((a,b)=>a+b,0);
  history.unshift({num,tonality:data.tonality,diff:data.diff,progression:[...data.progression],nbMesures:data.nbMesures,resolutions:[...resolutions]});
  if(history.length>12)history.pop();

  const si=document.getElementById('sessionInfo');
  if(si)si.textContent=`Session ${num} · ${data.nbMesures} mesures · ${data.diff}`;

  const diffCol={doux:'#1db954',medium:'#f7c948',spicy:'#e8402a'}[data.diff];

  let leftHTML=`
    <div class="panel-title">Main gauche — accords & rythme</div>
    <div class="transport">
      <div class="bpm-control">
        <button class="bpm-btn" id="bpmDown">−</button>
        <span class="bpm-label">BPM</span>
        <span class="bpm-val" id="bpmDisplay">${bpm}</span>
        <button class="bpm-btn" id="bpmUp">+</button>
      </div>
      <button class="play-btn${isValidTotal()?'':' blocked'}" id="playBtn">▶ Jouer</button>
      <button class="metro-btn ${metronomeOn?'on':''}" id="metroBtn">🥁 Métro</button>
      <button class="edit-btn-global" id="editBtnGlobal">✏️ Éditer</button>
      <span class="total-badge" id="totalBadge">—</span>
    </div>
    <div class="beat-counter" id="beatCounter"><span>1</span> · <span>2</span> · <span>3</span> · <span>4</span></div>`;

  data.progression.forEach((acc,i)=>{
    const nomFR=ACCORDS_FR[acc]||acc;
    const notes=(NOTES_ACC[acc]||[]).join(' · ');
    const pattern=data.patterns[i];
    const res=resolutions[i];
    const cLocked=lockedSlots[i]!==null,rLocked=lockedPatterns[i]!==null;

    const resBtnsHTML=RES_OPTIONS.map(r=>{
      const testTotal=Array.from({length:data.nbMesures},(_,j)=>j===i?r:resolutions[j]).reduce((a,b)=>a+b,0);
      const wouldWarn=testTotal%2!==0;
      return`<button class="res-btn${r===res?' active':''}${r!==res&&wouldWarn?' warn':''}" data-slot="${i}" data-res="${r}">${RES_LABELS[r]}</button>`;
    }).join('');

    let numRow='',groupsHTML='';
    for(let g=0;g<res;g++){
      numRow+=`<div style="flex:1;display:flex;">`+[0,1,2,3].map(s=>`<div class="beat-num-cell ${s===0?'strong':''}" style="${s===2?'opacity:0.5':''}">${s===0?(g+1):(s===2?'+':'')}</div>`).join('')+`</div>`;
      groupsHTML+=`<div class="beat-group">`;
      for(let s=0;s<4;s++){const idx=g*4+s;groupsHTML+=`<div class="beat ${pattern[idx]===1?'on':'rest'}" data-mesure="${i}" data-beat="${idx}"></div>`;}
      groupsHTML+=`</div>`;
    }

    let pickerHTML=`<div class="accord-picker" id="picker-${i}">`;
    ALL_CHORDS.forEach(ch=>{pickerHTML+=`<button class="pick-btn${ch===acc?' selected':''}" data-chord="${ch}" data-slot="${i}">${ACCORDS_FR[ch]||ch}</button>`;});
    pickerHTML+=`<button class="pick-btn pick-cancel" data-cancel="${i}">✕</button></div>`;

    leftHTML+=`
      <div class="accord-block${cLocked?' chord-locked':''}${rLocked?' rythm-locked':''}" id="block-${i}">
        <div class="accord-header">
          <span class="mesure-num">M.${i+1}</span>
          <span class="accord-name" id="acc-name-${i}">${nomFR}</span>
          <span class="accord-notes" id="acc-notes-${i}">${notes}</span>
          <div class="res-inline"><span class="res-lbl">Dur.</span>${resBtnsHTML}</div>
          <div class="accord-icons">
            <button class="icon-btn" id="edit-chord-btn-${i}" title="Choisir accord">✏️</button>
            <button class="icon-btn chord-lock-btn${cLocked?' locked':''}" id="chord-lock-btn-${i}">${cLocked?'🔒':'🔓'}</button>
            <button class="icon-btn rythm-lock-btn${rLocked?' locked':''}" id="rythm-lock-btn-${i}">${rLocked?'🎵':'🎶'}</button>
          </div>
        </div>
        ${pickerHTML}
        <div class="seq-wrapper">
          <div class="beat-nums" style="display:flex;margin-bottom:2px;">${numRow}</div>
          <div class="sequencer" id="seq-${i}">${groupsHTML}</div>
          <div class="rhythm-label" id="rlabel-${i}">${patternToLabel(pattern,res)}</div>
        </div>
      </div>`;
  });

  leftHTML+=`<div class="shortcut-hint">Espace/R → session · T → rythme · P → play · E → éditer · H → historique</div>`;

  const notesGamme=data.tonality==='Am'?['La','Si','Do','Ré','Mi','Fa','Sol']:['Do','Ré','Mi','Fa','Sol','La','Si'];
  const pentat=data.tonality==='Am'?['La','Do','Ré','Mi','Sol']:['Do','Ré','Mi','Sol','La'];
  const firstNotes=NOTES_ACC[data.progression[0]]||[];

  let rightHTML=`
    <div class="panel-title">Main droite</div>
    <div class="piano-section"><h3>Clavier — accord actif</h3>${renderPiano(firstNotes)}</div>
    <div class="constraint-section">
      <h3>Contraintes · <span style="color:${diffCol}">${data.diff}</span></h3>
      ${data.contraintes.map(c=>`<div class="constraint-item"><div class="constraint-dot"></div><span>${c}</span></div>`).join('')}
    </div>
    <div class="defi-section"><h3>⚡ Défi</h3><div class="defi-text">${data.defi}</div></div>`;

  document.getElementById('panelLeft').innerHTML=leftHTML;
  document.getElementById('panelRight').innerHTML=rightHTML;
  updatePianoLit(firstNotes);
  refreshLockAllChordsBtn();refreshLockAllRythmsBtn();
  updateTotalBadge();

  document.getElementById('bpmDown').addEventListener('click',()=>{bpm=Math.max(40,bpm-5);document.getElementById('bpmDisplay').textContent=bpm;if(isPlaying){stopScheduler();startScheduler();}});
  document.getElementById('bpmUp').addEventListener('click',()=>{bpm=Math.min(200,bpm+5);document.getElementById('bpmDisplay').textContent=bpm;if(isPlaying){stopScheduler();startScheduler();}});
  document.getElementById('playBtn').addEventListener('click',togglePlay);
document.getElementById('playBtnTop').addEventListener('click',togglePlay);
  document.getElementById('metroBtn').addEventListener('click',()=>{metronomeOn=!metronomeOn;document.getElementById('metroBtn').classList.toggle('on',metronomeOn);});
  document.getElementById('editBtnGlobal').addEventListener('click',()=>{if(!isPlaying)toggleEditMode();});
  for(let i=0;i<data.nbMesures;i++){
    document.getElementById(`chord-lock-btn-${i}`).addEventListener('click',()=>toggleChordLock(i));
    document.getElementById(`rythm-lock-btn-${i}`).addEventListener('click',()=>toggleRythmLock(i));
    document.getElementById(`edit-chord-btn-${i}`).addEventListener('click',()=>togglePicker(i));
  }
  document.getElementById('panelLeft').addEventListener('click',e=>{
    const pb=e.target.closest('.pick-btn');
    if(pb){if(pb.dataset.cancel!==undefined){closePicker();return;}pickChord(parseInt(pb.dataset.slot),pb.dataset.chord);return;}
    const rb=e.target.closest('.res-btn');
    if(rb){setResolution(parseInt(rb.dataset.slot),parseInt(rb.dataset.res));return;}
    if(!editMode||isPlaying)return;
    const beatEl=e.target.closest('.beat');
    if(!beatEl)return;
    const mi=parseInt(beatEl.dataset.mesure),bi=parseInt(beatEl.dataset.beat);
    if(!isNaN(mi)&&!isNaN(bi))toggleBeat(mi,bi);
  });
}

// ─── PLAY ────────────────────────────────────────────────────────────────────
function togglePlay(){
  if(!isPlaying&&!isValidTotal())return;
  if(isPlaying){isPlaying=false;stopScheduler();updateTotalBadge();}
  else{exitEditMode();isPlaying=true;startScheduler();updateTotalBadge();}
  for(const id of['playBtn','playBtnTop']){
    const btn=document.getElementById(id);
    if(btn){btn.textContent=isPlaying?(id==='playBtnTop'?'■':'■ Stop'):(id==='playBtnTop'?'▶':'▶ Jouer');btn.classList.toggle('playing',isPlaying);btn.classList.remove('blocked');}
  }
}

// ─── HISTORY ─────────────────────────────────────────────────────────────────
function openHistory(){
  const grid=document.getElementById('histGrid');
  if(!history.length){grid.innerHTML='<div style="color:var(--muted);font-size:0.85rem;">Pas encore de sessions !</div>';document.getElementById('histOverlay').classList.add('open');return;}
  grid.innerHTML=history.map((h,i)=>{
    const accFR=h.progression.map(a=>ACCORDS_FR[a]||a).join(' → ');
    return`<div class="hist-card" data-idx="${i}"><div class="hist-num">Session #${h.num}</div><div class="hist-accords">${accFR}</div><div class="hist-meta">${h.tonality==='Am'?'La min':'Do maj'} · ${h.diff} · ${h.nbMesures} mesures</div><div class="hist-reuse">↩ Rejouer</div></div>`;
  }).join('');
  grid.querySelectorAll('.hist-card').forEach(card=>{
    card.addEventListener('click',()=>{
      const h=history[parseInt(card.dataset.idx)];closeHistory();
      for(let i=0;i<h.progression.length;i++)lockedSlots[i]=h.progression[i];
      if(h.resolutions)for(let i=0;i<h.resolutions.length;i++)resolutions[i]=h.resolutions[i];
      const diff=document.getElementById('difficulty').value;
      const patterns=h.progression.map((_,i)=>lockedPatterns[i]!==null?[...lockedPatterns[i]]:getRandPattern(resolutions[i],diff));
      const cp=CONTRAINTES[diff];const contraintes=[];const nb=diff==='doux'?3:diff==='medium'?4:5;
      while(contraintes.length<nb){const c=getRandom(cp);if(!contraintes.includes(c))contraintes.push(c);}
      renderCard({tonality:h.tonality,progression:[...h.progression],patterns,contraintes,defi:getRandom(DEFIS[diff]),diff,nbMesures:h.nbMesures});
    });
  });
  document.getElementById('histOverlay').classList.add('open');
}
function closeHistory(){document.getElementById('histOverlay').classList.remove('open');}

// ─── MUSETHESIA ───────────────────────────────────────────────────────────────
const NOTE_SEMITONE={'Do':0,'Do#':1,'Ré':2,'Ré#':3,'Mi':4,'Fa':5,'Fa#':6,'Sol':7,'Sol#':8,'La':9,'La#':10,'Si':11};
const MEASURE_COLORS=['#1db954','#f7c948','#e8402a','#4a9eff','#ff6b9d','#a855f7','#22d3ee','#fb923c'];
const MUSETHESIA_LOOK_AHEAD=2;
const MUSETHESIA_NOTE_HEIGHT=36;
const MUSETHESIA_PIANO_HEIGHT=100;
const FIRST_MIDI=36;
const LAST_MIDI=84;
const WHITE_KEY_COUNT=29;

function noteNameToMidiNumber(name,oct){
  const s=NOTE_SEMITONE[name];
  if(s===undefined)return null;
  return(oct+1)*12+s;
}

function buildMusesthesiaEvents(){
  museThesiaEvents=[];
  if(!currentData||!cellMap.length)return;
  const cellDuration=60/bpm/4;
  for(let c=0;c<cellMap.length;c++){
    const entry=cellMap[c],mi=entry.mesureIdx,lc=entry.localCell;
    if(currentData.patterns[mi][lc]===1){
      const chordName=currentData.progression[mi];
      const noteNames=NOTES_ACC[chordName]||[];
      const midiNotes=[];
      const displayNotes=[];
      noteNames.forEach(n=>{
        const m=noteNameToMidiNumber(n,4);if(m!==null){midiNotes.push(m);displayNotes.push({name:n,midi:m,oct:4});}
        const b=noteNameToMidiNumber(n,3);if(b!==null){midiNotes.push(b);displayNotes.push({name:n,midi:b,oct:3});}
      });
      museThesiaEvents.push({cell:c,midiNotes,displayNotes,color:MEASURE_COLORS[mi%MEASURE_COLORS.length],chordName});
    }
  }
  museThesiaLoopDur=cellMap.length*cellDuration;
  console.log('[MuseThesia] events built:', museThesiaEvents.map(e=>({
    cell:e.cell,
    chord:e.chordName,
    notes:e.displayNotes.map(d=>d.name+'('+d.midi+')')
  })));
}

function setupMusesthesiaCanvas(){
  const canvas=document.getElementById('fallCanvas');
  if(!canvas)return;
  const parent=canvas.parentElement;
  const rect=parent.getBoundingClientRect();
  canvas.width=rect.width;
  canvas.height=rect.height;
}

function drawMusesthesiaPiano(ctx,w,h){
  const pianoY=h-MUSETHESIA_PIANO_HEIGHT;
  ctx.fillStyle='#1a1c2a';
  ctx.fillRect(0,pianoY,w,MUSETHESIA_PIANO_HEIGHT);
  const whiteKeyWidth=w/WHITE_KEY_COUNT;
  let wkIdx=0;
  for(let m=FIRST_MIDI;m<=LAST_MIDI;m++){
    const semi=m%12;
    if([0,2,4,5,7,9,11].includes(semi)){
      const x=wkIdx*whiteKeyWidth;
      ctx.fillStyle='#e8ecff';
      ctx.fillRect(x+1,pianoY+1,whiteKeyWidth-2,MUSETHESIA_PIANO_HEIGHT-2);
      ctx.fillStyle='rgba(0,0,0,0.25)';
      ctx.font='8px JetBrains Mono,monospace';
      ctx.textAlign='center';
      const label=['Do','Ré','Mi','Fa','Sol','La','Si'][[0,2,4,5,7,9,11].indexOf(semi)];
      ctx.fillText(label,x+whiteKeyWidth/2,pianoY+MUSETHESIA_PIANO_HEIGHT-6);
      wkIdx++;
    }
  }
  wkIdx=0;
  for(let m=FIRST_MIDI;m<=LAST_MIDI;m++){
    const semi=m%12;
    if([1,3,6,8,10].includes(semi)){
      const prevWKIdx=Math.max(0,wkIdx-1);
      const prevWhiteX=prevWKIdx*whiteKeyWidth;
      ctx.fillStyle='#0a0b10';
      ctx.fillRect(prevWhiteX+whiteKeyWidth*0.65+1,pianoY,whiteKeyWidth*0.35-2,MUSETHESIA_PIANO_HEIGHT*0.6);
    }
    if([0,2,4,5,7,9,11].includes(semi))wkIdx++;
  }
  ctx.strokeStyle='rgba(232,64,42,0.4)';
  ctx.lineWidth=2;
  ctx.beginPath();
  ctx.moveTo(0,pianoY-1);
  ctx.lineTo(w,pianoY-1);
  ctx.stroke();
}

function midiToX(midiNote,w){
  let wkIdx=0;
  for(let m=FIRST_MIDI;m<=LAST_MIDI;m++){
    const semi=m%12;
    if([0,2,4,5,7,9,11].includes(semi)){
      if(m===midiNote)return(wkIdx+0.5)*(w/WHITE_KEY_COUNT);
      wkIdx++;
    }
  }
  return((midiNote-FIRST_MIDI)/(LAST_MIDI-FIRST_MIDI))*w;
}
function museThesiaLoop(){
  if(!museThesiaActive)return;
  const canvas=document.getElementById('fallCanvas');
  if(!canvas||!canvas.width||!canvas.height){museThesiaRaf=requestAnimationFrame(museThesiaLoop);return;}
  const ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height;
  const now=(audioCtx||getCtx()).currentTime;

  ctx.clearRect(0,0,w,h);
  ctx.fillStyle='#0a0b10';
  ctx.fillRect(0,0,w,h);

  const fallHeight=h-MUSETHESIA_PIANO_HEIGHT;
  const PREVIEW_H=50;

  // grid lines for white keys
  ctx.fillStyle='rgba(255,255,255,0.02)';
  let wkIdx=0;
  for(let m=FIRST_MIDI;m<=LAST_MIDI;m++){
    if([0,2,4,5,7,9,11].includes(m%12)){
      ctx.fillRect(wkIdx*(w/WHITE_KEY_COUNT),PREVIEW_H,0.5,fallHeight-PREVIEW_H);
      wkIdx++;
    }
  }

  // compute base time from scheduler state
  const cellDuration=60/bpm/4;
  const baseTime=nextBeatTime-currentCell*cellDuration;

  // collect visible events (using scheduler-aligned times)
  const visibleEvents=[];
  for(const event of museThesiaEvents){
    let t=baseTime+event.cell*cellDuration;
    while(t<now-1)t+=museThesiaLoopDur;
    while(t>now+MUSETHESIA_LOOK_AHEAD+0.5)t-=museThesiaLoopDur;
    if(t>=now-0.5&&t<=now+MUSETHESIA_LOOK_AHEAD+0.5){
      visibleEvents.push({event,t});
    }
  }
  visibleEvents.sort((a,b)=>a.t-b.t);

  // next chord preview badge
  let nextEvent=null,nextT=Infinity;
  for(const {event,t} of visibleEvents){
    if(t>now&&t<nextT){nextT=t;nextEvent=event;}
  }
  if(nextEvent){
    const py=6;
    const chordLabel=ACCORDS_FR[nextEvent.chordName]||nextEvent.chordName;
    ctx.fillStyle=nextEvent.color+'55';
    ctx.beginPath();ctx.roundRect(w/2-60,py,120,24,6);ctx.fill();
    ctx.fillStyle=nextEvent.color+'bb';
    ctx.font='14px Syne,sans-serif';
    ctx.textAlign='center';
    ctx.fillText('▶ '+chordLabel,w/2,py+17);
    ctx.fillStyle='rgba(255,255,255,0.2)';
    ctx.font='10px JetBrains Mono,monospace';
    const secs=(nextT-now).toFixed(1);
    ctx.fillText('dans '+secs+'s',w/2,py+32);
  }

  // draw falling notes
  for(const {event,t} of visibleEvents){
    const progress=1-(t-now)/MUSETHESIA_LOOK_AHEAD;
    const y=Math.max(-MUSETHESIA_NOTE_HEIGHT,Math.min(fallHeight,progress*(fallHeight-MUSETHESIA_NOTE_HEIGHT)));

    const noteW=w/WHITE_KEY_COUNT*0.8;

    for(let ni=0;ni<event.midiNotes.length;ni++){
      const mn=event.midiNotes[ni];
      const x=midiToX(mn,w);
      ctx.fillStyle=event.color+'D9';
      ctx.shadowColor=event.color+'66';
      ctx.shadowBlur=4;
      ctx.beginPath();
      ctx.roundRect(x-noteW/2,y,noteW,MUSETHESIA_NOTE_HEIGHT,4);
      ctx.fill();
      ctx.shadowBlur=0;
      if(ni<event.displayNotes.length){
        const dn=event.displayNotes[ni];
        ctx.fillStyle='rgba(255,255,255,0.7)';
        ctx.font='10px JetBrains Mono,monospace';
        ctx.textAlign='center';
        ctx.fillText(dn.name,x,y+14);
      }
    }

    // chord label centered on the group
    const midIdx=Math.min(2,event.displayNotes.length-1);
    const mid=event.displayNotes[midIdx];
    if(mid){
      ctx.fillStyle='rgba(255,255,255,0.55)';
      ctx.font='11px Syne,sans-serif';
      ctx.textAlign='center';
      const labelX=midiToX(mid.midi,w);
      ctx.fillText(ACCORDS_FR[event.chordName]||event.chordName,labelX,y+25);
    }
  }

  // hit line at top of piano
  ctx.strokeStyle='rgba(232,64,42,0.5)';
  ctx.lineWidth=2;
  ctx.setLineDash([8,5]);
  ctx.beginPath();
  ctx.moveTo(0,fallHeight);
  ctx.lineTo(w,fallHeight);
  ctx.stroke();
  ctx.setLineDash([]);

  drawMusesthesiaPiano(ctx,w,h);
  museThesiaRaf=requestAnimationFrame(museThesiaLoop);
}

function startMusesthesia(){
  if(!museThesiaActive)return;
  const canvas=document.getElementById('fallCanvas');
  if(canvas)setupMusesthesiaCanvas();
  buildMusesthesiaEvents();
  const info=document.getElementById('museThesiaInfo');
  if(info&&currentData)info.textContent=`${currentData.tonality==='Am'?'La min':'Do maj'} · ${currentData.progression.map(a=>ACCORDS_FR[a]||a).join(' → ')} · ${bpm} BPM · ${currentData.diff}`;
  if(museThesiaRaf)cancelAnimationFrame(museThesiaRaf);
  museThesiaRaf=requestAnimationFrame(museThesiaLoop);
}

function stopMusesthesia(){
  if(museThesiaRaf){cancelAnimationFrame(museThesiaRaf);museThesiaRaf=null;}
  const canvas=document.getElementById('fallCanvas');
  if(canvas){const ctx=canvas.getContext('2d');if(ctx)ctx.clearRect(0,0,canvas.width,canvas.height);}
  const info=document.getElementById('museThesiaInfo');
  if(info)info.textContent='';
}

function toggleMusesthesia(){
  museThesiaActive=!museThesiaActive;
  const view=document.getElementById('museThesiaView');
  const main=document.querySelector('.main');
  const btn=document.getElementById('visToggle');
  const bottomBar=document.querySelector('.bottom-bar');

  if(museThesiaActive){
    view.style.display='flex';
    main.style.display='none';
    bottomBar.style.display='none';
    btn.textContent='🎹 Séquenceur';
    if(isPlaying)startMusesthesia();
  }else{
    view.style.display='none';
    main.style.display='grid';
    bottomBar.style.display='flex';
    btn.textContent='🎹 Musethesia';
    stopMusesthesia();
  }
}

// ─── FULLSCREEN ──────────────────────────────────────────────────────────────
function updateFsIcon(){
  const btn=document.getElementById('fsBtn');
  if(btn)btn.textContent=document.fullscreenElement?'✕':'⛶';
}
function toggleFullscreen(){
  if(document.fullscreenElement){document.exitFullscreen();}
  else{document.documentElement.requestFullscreen();}
}
document.addEventListener('fullscreenchange',updateFsIcon);

// ─── INIT ────────────────────────────────────────────────────────────────────
currentData=genererCarte();renderCard(currentData);
document.getElementById('fsBtn').addEventListener('click',toggleFullscreen);
document.getElementById('newCardBtn').addEventListener('click',()=>{resolutions=Array(8).fill(4);renderCard(genererCarte());});
document.getElementById('regenRhythmBtn').addEventListener('click',()=>renderCard(genererCarte(true)));
document.getElementById('lockAllChordsBtn').addEventListener('click',toggleLockAllChords);
document.getElementById('lockAllRythmsBtn').addEventListener('click',toggleLockAllRythms);
document.getElementById('histBtn').addEventListener('click',openHistory);
document.getElementById('visToggle').addEventListener('click',toggleMusesthesia);
document.getElementById('histClose').addEventListener('click',closeHistory);
document.getElementById('histOverlay').addEventListener('click',e=>{if(e.target===document.getElementById('histOverlay'))closeHistory();});
window.addEventListener('resize',()=>{if(museThesiaActive){const c=document.getElementById('fallCanvas');if(c)setupMusesthesiaCanvas();}});
window.addEventListener('keydown',e=>{
  if(e.target.tagName==='SELECT')return;
  if(e.code==='Space'||e.code==='KeyR'){e.preventDefault();resolutions=Array(8).fill(4);renderCard(genererCarte());}
  if(e.code==='KeyT'){e.preventDefault();renderCard(genererCarte(true));}
  if(e.code==='KeyP'){e.preventDefault();togglePlay();}
  if(e.code==='KeyH'){e.preventDefault();openHistory();}
  if(e.code==='KeyE'){e.preventDefault();if(!isPlaying)toggleEditMode();}
  if(e.code==='KeyV'){e.preventDefault();toggleMusesthesia();}
});

// ─── MIDI ────────────────────────────────────────────────────────────────────
(async function initMIDI() {
    await midi.init();
})();

document.addEventListener('midi-note-on', ((e) => {
    const { note, velocity } = e.detail;
    console.log(`🎹 Note ON: ${note} (v:${velocity})`);
}) as EventListener);

document.addEventListener('midi-note-off', ((e) => {
    const { note } = e.detail;
    console.log(`🔇 Note OFF: ${note}`);
}) as EventListener);

document.addEventListener('midi-devices-changed', ((e) => {
    const { count } = e.detail;
    console.log(`📡 ${count} périphérique(s) MIDI`);
    const el = document.getElementById('midi-count');
    if (el) el.textContent = String(count);
}) as EventListener);

console.log('🎵 MuseJam-Desktop prêt !');
