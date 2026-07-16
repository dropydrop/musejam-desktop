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
     épicé:[[1,0,0,0,1,0,0,0,1,0,0,0,0,0,1,0],[1,0,0,0,1,0,0,0,0,0,1,0,1,0,0,0],[1,0,0,0,0,0,1,0,1,0,0,0,1,0,0,0],[1,0,0,0,1,0,1,0,0,0,0,0,1,0,0,0],[1,0,0,0,1,0,0,0,1,0,0,0,1,0,1,0],[1,0,0,0,1,0,0,0,1,0,1,0,0,0,0,0]],
    enflammé:[[1,0,1,0,0,0,1,0,0,0,0,0,1,0,0,0],[1,0,0,0,0,0,1,0,1,0,1,0,0,0,1,0],[1,0,0,0,1,0,0,0,0,0,1,0,0,0,1,0],[1,0,1,0,0,0,0,0,1,0,1,0,1,0,0,0],[1,0,1,0,0,0,1,0,0,0,0,0,1,0,0,0]],
  },
  2:{
    doux:[[1,0,0,0,1,0,0,0],[1,0,0,0,0,0,0,0],[0,0,0,0,1,0,0,0],[1,0,0,0,1,0,1,0]],
    épicé:[[1,0,0,0,0,0,1,0],[1,0,1,0,0,0,0,0],[1,0,0,0,1,0,0,0],[0,0,1,0,1,0,0,0],[1,0,0,0,0,0,1,0]],
    enflammé:[[1,0,1,0,0,0,1,0],[0,0,1,0,1,0,1,0],[1,0,1,0,1,0,0,0],[1,0,0,0,1,0,1,0]],
  },
  1:{
    doux:[[1,0,0,0],[1,0,0,0],[0,0,1,0],[1,0,1,0]],
    épicé:[[1,0,0,0],[0,0,1,0],[1,0,1,0],[1,0,0,0]],
    enflammé:[[1,0,1,0],[0,0,1,0],[1,0,0,0],[1,0,1,0]],
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
let audioCtx=null,masterGain=null,nextBeatTime=0,currentCell=0,totalCells=0;
let schedulerTimer=null,scheduledBeats=[],lastRenderedCell=-1,rafId=null;
let currentData=null,history=[];
let lockedSlots=Array(8).fill(null);
let lockedPatterns=Array(8).fill(null);
let resolutions=Array(8).fill(4);

// ─── MUSETHESIA STATE (deprecated — kept for compatibility)


// ─── CHORD / MUSIC DATA ──────────────────────────────────────────────────────
const ALL_CHORDS=["Am","G","Em","F","C","Dm","Am7","Fmaj7","Gsus4","Em7","Dm7","G7"];
const ACCORDS_FR={"Am":"LAm","G":"SOL","Em":"MIm","F":"FA","C":"DO","Dm":"RÉm","Am7":"LAm7","Fmaj7":"FAmaj7","Gsus4":"SOLsus4","Em7":"MIm7","Dm7":"RÉm7","G7":"SOL7"};
const NOTES_ACC={"Am":["La","Do","Mi"],"G":["Sol","Si","Ré"],"Em":["Mi","Sol","Si"],"F":["Fa","La","Do"],"C":["Do","Mi","Sol"],"Dm":["Ré","Fa","La"],"Am7":["La","Do","Mi","Sol"],"Fmaj7":["Fa","La","Do","Mi"],"Gsus4":["Sol","Do","Ré"],"Em7":["Mi","Sol","Si","Ré"],"Dm7":["Ré","Fa","La","Do"],"G7":["Sol","Si","Ré","Fa"]};
const NOTE_FREQ={"Do":261.63,"Do#":277.18,"Ré":293.66,"Ré#":311.13,"Mi":329.63,"Fa":349.23,"Fa#":369.99,"Sol":392.00,"Sol#":415.30,"La":440.00,"La#":466.16,"Si":493.88};
const CONTRAINTES={
  doux:[
    "Joue avec des notes qui sonnent bien ensemble.",
    "Commence chaque mesure sur une note qui t'inspire.",
    "Fais des petits sauts, pas des grands.",
    "Termine ta phrase sur une note qui repose l'oreille.",
    "Une note par temps — prends ton temps.",
    "Commence chaque phrase par une note tenue, puis laisse-la s'éteindre.",
    "Joue des notes qui se touchent, comme si tu marchais sur des cailloux.",
    "Chaque note doit avoir sa propre respiration.",
    "Imagine que tu chantes la note avant de la jouer."
  ],
  épicé:[
    "Commence par la note principale de l'accord.",
    "Fais un seul grand saut par mesure.",
    "Évite de répéter deux fois la même note de suite.",
    "Termine chaque mesure sur une note de l'accord.",
    "Essaie une note de passage entre deux notes éloignées.",
    "Varie les nuances : une phrase forte, une phrase douce.",
    "Fais une petite pause avant la dernière note de la mesure.",
    "Joue trois notes qui montent, puis trois qui descendent.",
    "Commence doucement, puis accélère sur la fin de la phrase.",
    "Joue une note aiguë, puis une note grave, comme un appel et une réponse."
  ],
  enflammé:[
    "Toutes les notes sont permises — ose tout.",
    "Joue en décalé sur le 2e ou 4e temps (syncope).",
    "Double les notes à la main droite sur les temps forts.",
    "Joue deux notes éloignées, puis reviens tout près en douceur.",
    "Monte dans les aigus, puis redescends progressivement.",
    "Ajoute une petite note de passage rapide (broderie).",
    "Ose une note bleue pour une couleur blues.",
    "Joue la même phrase deux fois, mais change complètement la fin.",
    "Place une note très aiguë sur le temps faible de chaque mesure.",
    "Crée un mur de notes sur les temps forts (accords plaqués), puis un vide sur les temps faibles.",
    "Joue ta main gauche en décalé par rapport à ta main droite."
  ]
};
const DEFIS={
  doux:[
    "Joue tout doucement — comme si tu ne voulais pas réveiller quelqu'un.",
    "Ferme les yeux et improvise sans regarder le clavier.",
    "Reste dans une seule zone du clavier (une octave).",
    "Chaque note dure un temps, pas plus.",
    "Ta mélodie doit finir sur la note qui donne son nom à l'accord.",
    "Comme si tu jouais pour un enfant qui s'endort.",
    "N'utilise que les doigts 2, 3 et 4 (pas le pouce ni l'auriculaire).",
    "Improvise en pensant à un paysage, pas à des notes."
  ],
  épicé:[
    "Balance rapidement deux notes voisines sur le 3e temps.",
    "Joue une mesure fort, la suivante douce, et ainsi de suite.",
    "Glisse doucement d'une note à l'autre avant chaque changement d'accord.",
    "Finis sur la même note que la main gauche.",
    "Répète un petit motif de 2 ou 3 notes, puis change une note à chaque répétition.",
    "Joue uniquement sur les temps faibles (contretemps).",
    "Joue une phrase, puis son reflet inversé (comme un miroir).",
    "Laisse une note sonner longtemps, puis joue une cascade rapide.",
    "Improvise comme si tu racontais une histoire à un ami.",
    "Joue deux/trois notes rapides à la main droite, et des notes graves à la main gauche."
  ],
  enflammé:[
    "Joue deux notes rapides sur un temps faible, puis une note forte sur le temps suivant.",
    "Joue des intervalles (deux notes en même temps) à la main droite, et une basse différente à la main gauche.",
    "Crée une mélodie différente pour chaque accord.",
    "Commence ta phrase un tout petit peu avant le premier temps de la mesure.",
    "Monte en intensité jusqu'à la moitié de la session, puis redescends doucement.",
    "Joue une phrase très rapide, puis un long silence, puis une autre phrase.",
    "Ta main gauche joue une basse régulière, ta main droite improvise en décalé.",
    "Monte en tension sur 4 mesures, puis relâche tout sur la 5e."
  ]
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
  const cp=CONTRAINTES[diff];const contraintes=[];const nb=diff==='doux'?3:diff==='épicé'?4:5;
  while(contraintes.length<nb){const c=getRandom(cp);if(!contraintes.includes(c))contraintes.push(c);}
  const dp=DEFIS[diff];const defis=[];const nbDefis=diff==='doux'?2:3;
  while(defis.length<nbDefis){const d=getRandom(dp);if(!defis.includes(d))defis.push(d);}
  return{tonality,progression,patterns,contraintes,defis,diff,nbMesures};
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
function getCtx(){if(!audioCtx){audioCtx=new(window.AudioContext||window.webkitAudioContext)();masterGain=audioCtx.createGain();masterGain.gain.value=0.715;masterGain.connect(audioCtx.destination);}return audioCtx;}
function playClick(time,strong){
  const ctx=getCtx();
  const buf=ctx.createBuffer(1,ctx.sampleRate*0.04,ctx.sampleRate);
  const d=buf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/d.length,8);
  const noise=ctx.createBufferSource();noise.buffer=buf;
  const ng=ctx.createGain();ng.gain.setValueAtTime(strong?0.4356:0.17424,time);ng.gain.exponentialRampToValueAtTime(0.001,time+0.04);
  noise.connect(ng);ng.connect(masterGain);noise.start(time);noise.stop(time+0.05);
  const osc=ctx.createOscillator();const og=ctx.createGain();
  osc.type='sine';osc.frequency.setValueAtTime(strong?1000:700,time);osc.frequency.exponentialRampToValueAtTime(strong?600:400,time+0.03);
  og.gain.setValueAtTime(strong?0.30096:0.12672,time);og.gain.exponentialRampToValueAtTime(0.001,time+0.03);
  osc.connect(og);og.connect(masterGain);osc.start(time);osc.stop(time+0.04);
}

function midiToFreq(m){return 440*Math.pow(2,(m-69)/12);}
function getChordAudioMidis(chordName){
  const notes=NOTES_ACC[chordName];
  if(!notes)return[];
  const midis=[];
  let prev=noteNameToMidiNumber(notes[0],4);
  if(prev===null||prev<48||prev>96){prev=noteNameToMidiNumber(notes[0],3);if(prev!==null&&(prev<48||prev>96))prev=null;}
  if(prev===null)return[];
  midis.push(prev);
  for(let i=1;i<notes.length;i++){
    const n=notes[i];
    let m=noteNameToMidiNumber(n,4);
    if(m===null||m<=prev)m=noteNameToMidiNumber(n,5);
    if(m===null||m<48||m>96)continue;
    midis.push(m);prev=m;
  }
  if(midis.some(m=>m>96))for(let i=0;i<midis.length;i++)midis[i]-=12;
  return midis;
}
function playChordNotes(chordName,velocity){
  const ctx=getCtx(),midis=getChordAudioMidis(chordName);
  if(!midis.length)return;const now=ctx.currentTime,duration=0.15,gain=0.3;
  for(const m of midis){
    const freq=midiToFreq(m);
    const osc=ctx.createOscillator(),gn=ctx.createGain();
    osc.type='triangle';osc.frequency.setValueAtTime(freq,now);
    gn.gain.setValueAtTime(gain,now);gn.gain.exponentialRampToValueAtTime(0.001,now+duration);
    osc.connect(gn);gn.connect(masterGain);osc.start(now);osc.stop(now+duration+0.01);
  }
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
    const musethesiaView=document.getElementById('museThesiaView');
    if(musethesiaView&&musethesiaView.style.display!=='flex')playChordNotes(currentData.progression[mi],0.8);
    flashPiano(chordNotes);
    if(museThesiaActive){
      const color=MEASURE_COLORS[mi%MEASURE_COLORS.length];
      spawnFallingNotes(chordNotes,color,currentData.progression[mi],mi);
    }
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

  const diffCol={doux:'#1db954',épicé:'#f7c948',enflammé:'#e8402a'}[data.diff];

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
    <div class="defi-section"><h3>⚡ Défis</h3>${data.defis.map(d=>`<div class="defi-text">${d}</div>`).join('')}</div>`;

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
  const cp=CONTRAINTES[diff];const contraintes=[];const nb=diff==='doux'?3:diff==='épicé'?4:5;
      while(contraintes.length<nb){const c=getRandom(cp);if(!contraintes.includes(c))contraintes.push(c);}
      const dp=DEFIS[diff];const defis=[];const nbDefis=diff==='doux'?2:3;
      while(defis.length<nbDefis){const d=getRandom(dp);if(!defis.includes(d))defis.push(d);}
      renderCard({tonality:h.tonality,progression:[...h.progression],patterns,contraintes,defis,diff,nbMesures:h.nbMesures});
    });
  });
  document.getElementById('histOverlay').classList.add('open');
}
function closeHistory(){document.getElementById('histOverlay').classList.remove('open');}

// ─── MUSETHESIA ───────────────────────────────────────────────────────────────
const MUS_FIRST_MIDI=48;
const MUS_LAST_MIDI=96;
const MUS_NUM_WHITE_KEYS=29;
const FR_NOTES=['Do','Do#','Ré','Ré#','Mi','Fa','Fa#','Sol','Sol#','La','La#','Si'];
const MEASURE_COLORS=['#1db954','#f7c948','#e8402a','#4a9eff','#ff6b9d','#a855f7','#22d3ee','#fb923c'];

let museThesiaActive=false;
let museThesiaRaf=null;
let fallingNotes=[];
let lastSpawnedCell=-1;
let impactLineIntensity=0;

function noteNameToMidiNumber(name,oct){
  const semitones={'Do':0,'Do#':1,'Ré':2,'Ré#':3,'Mi':4,'Fa':5,'Fa#':6,'Sol':7,'Sol#':8,'La':9,'La#':10,'Si':11};
  const s=semitones[name];
  if(s===undefined)return null;
  return(oct+1)*12+s;
}

function buildMusethesiaPiano(){
  const whiteKeys=[],blackKeys=[];
  let wkIdx=0;
  for(let m=MUS_FIRST_MIDI;m<=MUS_LAST_MIDI;m++){
    const semi=m%12,oct=Math.floor(m/12)-1;
    if([0,2,4,5,7,9,11].includes(semi)){
      whiteKeys.push({midi:m,label:wkIdx%7===0?FR_NOTES[semi]+oct:''});wkIdx++;
    }else blackKeys.push({midi:m,wkIdx:wkIdx-1});
  }
  let html='<div class="mus-piano-keys"><div class="mus-white-keys">';
  whiteKeys.forEach(k=>{html+='<div class="mus-wkey" data-midi="'+k.midi+'"><span class="mus-wkey-label">'+k.label+'</span></div>';});
  html+='</div><div class="mus-black-keys">';
  blackKeys.forEach(k=>{html+='<div class="mus-bkey" data-midi="'+k.midi+'" style="left:'+((k.wkIdx+1)/MUS_NUM_WHITE_KEYS)*100+'%"></div>';});
  html+='</div></div>';
  return html;
}

function midiToCanvasX(midi,canvasW){
  let wkIdx=0;
  for(let m=MUS_FIRST_MIDI;m<=MUS_LAST_MIDI;m++){
    if([0,2,4,5,7,9,11].includes(m%12)){if(m===midi)return(wkIdx+0.5)*(canvasW/MUS_NUM_WHITE_KEYS);wkIdx++;}
    else if(m===midi)return wkIdx*(canvasW/MUS_NUM_WHITE_KEYS);
  }
  return((midi-MUS_FIRST_MIDI)/(MUS_LAST_MIDI-MUS_FIRST_MIDI))*canvasW;
}

function spawnFallingNotes(notes,color,chordName,measureIdx){
  if(!museThesiaActive)return;
  const canvas=document.getElementById('fallCanvas');
  if(!canvas||!canvas.width)return;
  const duration=(60/bpm)*2;
  const tonicLabel=chordName?(ACCORDS_FR[chordName]||chordName):'';
  const tonicNote=notes[0];
  const all=[];
  for(const n of notes){
    for(const oct of[4,5]){
      const m=noteNameToMidiNumber(n,oct);
      if(m!==null&&m>=MUS_FIRST_MIDI&&m<=MUS_LAST_MIDI)all.push({midi:m,note:n});
    }
  }
  all.sort((a,b)=>a.midi-b.midi);
  let labeled=false;
  for(const item of all){
    const isTonic=item.note===tonicNote&&!labeled;
    if(isTonic)labeled=true;
    fallingNotes.push({midi:item.midi,x:midiToCanvasX(item.midi,canvas.width),color,startTime:performance.now(),duration,label:isTonic?tonicLabel:'',chord:isTonic?chordName:'',measureIdx});
  }
}

let musethesiaChordTimer=null;
function musethesiaSetChord(chordName){
  const notes=NOTES_ACC[chordName];
  if(!notes)return;
  if(musethesiaChordTimer){clearTimeout(musethesiaChordTimer);musethesiaChordTimer=null;}
  document.querySelectorAll('.mus-chord-active').forEach(el=>el.classList.remove('mus-chord-active'));
  document.querySelectorAll('.impact-flash').forEach(el=>el.classList.remove('impact-flash'));
  document.querySelectorAll('.mus-fundamental-label').forEach(el=>el.remove());
  // grey highlight all chord notes across all visible piano octaves
  notes.forEach(n=>{
    for(let oct=0;oct<=8;oct++){
      const midi=noteNameToMidiNumber(n,oct);
      if(midi!==null&&midi>=MUS_FIRST_MIDI&&midi<=MUS_LAST_MIDI){
        const el=document.querySelector(`[data-midi="${midi}"]`);
        if(el)el.classList.add('mus-chord-active');
      }
    }
  });
  // green flash + label only on audio-played notes
  const nomFR=ACCORDS_FR[chordName]||chordName;
  const audioMidis=getChordAudioMidis(chordName);
  for(const m of audioMidis){
    if(m>=MUS_FIRST_MIDI&&m<=MUS_LAST_MIDI){
      const el=document.querySelector(`[data-midi="${m}"]`);
      if(el){
        el.classList.add('impact-flash');
        if(!el.querySelector('.mus-fundamental-label')){
          const lbl=document.createElement('span');
          lbl.className='mus-fundamental-label';
          lbl.textContent=nomFR;
          el.appendChild(lbl);
        }
      }
    }
  }
  musethesiaChordTimer=setTimeout(()=>{
    document.querySelectorAll('.impact-flash').forEach(el=>el.classList.remove('impact-flash'));
    musethesiaChordTimer=null;
  },250);
}

function setupMusesthesiaCanvas(){
  const canvas=document.getElementById('fallCanvas');
  if(!canvas)return;
  const parent=canvas.parentElement;
  const piano=document.getElementById('museThesiaPiano');
  const pianoH=piano?Math.max(0,piano.getBoundingClientRect().height||140):140;
  const rect=parent.getBoundingClientRect();
  const oldW=canvas.width;
  canvas.width=rect.width;
  canvas.height=Math.max(100,rect.height-pianoH);
  // remap x of existing falling notes on resize
  if(oldW&&oldW!==canvas.width){
    for(const n of fallingNotes)n.x=midiToCanvasX(n.midi,canvas.width);
  }
}

function museThesiaLoop(){
  const canvas=document.getElementById('fallCanvas');
  const validCanvas=canvas&&canvas.width&&canvas.height;
  const ctx=validCanvas?canvas.getContext('2d'):null;
  const w=validCanvas?canvas.width:0;
  const h=validCanvas?canvas.height:0;
  const now=performance.now();

  if(validCanvas){
    ctx.clearRect(0,0,w,h);
    ctx.fillStyle='#0d0e15';
    ctx.fillRect(0,0,w,h);

    // grid lines
    ctx.fillStyle='rgba(255,255,255,0.02)';
    let wkC=0;
    for(let m=MUS_FIRST_MIDI;m<=MUS_LAST_MIDI;m++){
      if([0,2,4,5,7,9,11].includes(m%12)){
        ctx.fillRect(wkC*(w/MUS_NUM_WHITE_KEYS),0,0.5,h);
        wkC++;
      }
    }
  }

  // draw falling notes (always process audio, draw if canvas ready)
  const active=[];
  for(const n of fallingNotes){
    const elapsed=(now-n.startTime)/1000;
    const progress=Math.min(1,elapsed/n.duration);
    const y=progress*h;
    if(progress>=1){if(n.chord){playChordNotes(n.chord,0.8);updateMusethesiaChordInfo(n.chord,NOTES_ACC[n.chord]||[],n.measureIdx);musethesiaSetChord(n.chord);impactLineIntensity=1;}continue;}
    active.push(n);
    if(!validCanvas)continue;
    const nearness=Math.min(1,Math.max(0,(progress-0.15)/0.85));
    const noteAlpha=0.65+0.35*nearness;
    const noteScale=1+0.1*nearness;
    const noteW=(w/MUS_NUM_WHITE_KEYS)*0.8;
    const nw=noteW*noteScale;
    const nh=36*noteScale;
    const ny=y+36-nh;
    const r=6*noteScale;
    ctx.save();
    ctx.globalAlpha=noteAlpha;
    const grad=ctx.createLinearGradient(0,ny,0,ny+nh);
    grad.addColorStop(0,n.color+'b7');
    grad.addColorStop(0.4,n.color+'f5');
    grad.addColorStop(1,n.color);
    ctx.fillStyle=grad;
    ctx.shadowColor=n.color+'b7';
    ctx.shadowBlur=10+8*nearness;
    ctx.beginPath();ctx.roundRect(n.x-nw/2,ny,nw,nh,r);ctx.fill();
    ctx.shadowBlur=0;
    ctx.globalAlpha=1;
    if(n.label){
      const labelY=ny+nh/2;
      ctx.font='bold 11px JetBrains Mono,monospace';
      ctx.textAlign='center';ctx.textBaseline='middle';
      const tw=ctx.measureText(n.label).width;
      ctx.fillStyle='rgba(0,0,0,0.55)';
      ctx.beginPath();ctx.roundRect(n.x-tw/2-4,labelY-9,tw+8,18,4);ctx.fill();
      ctx.fillStyle='#fff';
      ctx.fillText(n.label,n.x,labelY+0.5);
    }
    ctx.restore();
  }
  fallingNotes=active;

  // impact line DOM
  const ilEl=document.getElementById('impactLine');
  if(ilEl)ilEl.style.opacity=Math.max(0.18,Math.min(1,impactLineIntensity*1.4));
  impactLineIntensity*=0.92;

  museThesiaRaf=requestAnimationFrame(museThesiaLoop);
}

function startMusesthesia(){
  if(!museThesiaActive)return;
  if(currentData){
    const chord=currentData.progression[0];
    updateMusethesiaChordInfo(chord,NOTES_ACC[chord]||[],0);
    musethesiaSetChord(chord);
  }
  fallingNotes=[];lastSpawnedCell=-1;
  if(museThesiaRaf)cancelAnimationFrame(museThesiaRaf);
  museThesiaRaf=requestAnimationFrame(museThesiaLoop);
}

function stopMusesthesia(){
  if(museThesiaRaf){cancelAnimationFrame(museThesiaRaf);museThesiaRaf=null;}
  fallingNotes=[];impactLineIntensity=0;
  if(musethesiaChordTimer){clearTimeout(musethesiaChordTimer);musethesiaChordTimer=null;}
  document.querySelectorAll('.mus-wkey,.mus-bkey').forEach(el=>el.classList.remove('impact-flash','mus-chord-active'));
  document.querySelectorAll('.mus-fundamental-label').forEach(el=>el.remove());
  const ilEl=document.getElementById('impactLine');
  if(ilEl)ilEl.style.opacity='0';
  const canvas=document.getElementById('fallCanvas');
  if(canvas){const ctx=canvas.getContext('2d');if(ctx)ctx.clearRect(0,0,canvas.width,canvas.height);}
}

function updateMusethesiaChordInfo(chordName,notes,measureIdx){
  const overlay=document.getElementById('museThesiaOverlayInfo');
  if(!overlay||!currentData)return;
  const nomFR=ACCORDS_FR[chordName]||chordName;
  const notesStr=notes.join(' · ');
  const baseTonal=currentData.tonality==='Am'?'La min':'Do maj';
  const progStr=currentData.progression.map((a,i)=>{
    const n=ACCORDS_FR[a]||a;
    return i===measureIdx?'<span class="musethesia-chord-highlight">'+n+'</span>':n;
  }).join(' → ');
  overlay.innerHTML='<span class="musethesia-chord-highlight">'+nomFR+' · '+notesStr+'</span> | '+baseTonal+' · '+progStr+' · '+bpm+' BPM · '+currentData.diff;
}

function toggleMusesthesia(){
  const view=document.getElementById('museThesiaView'),main=document.querySelector('.main'),btn=document.getElementById('visToggle'),bottomBar=document.querySelector('.bottom-bar');
  if(view.style.display!=='flex'){
    if(isPlaying)stopScheduler();
    view.style.display='flex';main.style.display='none';bottomBar.style.display='none';
    btn.textContent='🎹 Séquenceur';
    museThesiaActive=true;fallingNotes=[];lastSpawnedCell=-1;
    const piano=document.getElementById('museThesiaPiano');
    if(piano)piano.innerHTML=buildMusethesiaPiano();
    setupMusesthesiaCanvas();
    if(currentData){
      const chord=currentData.progression[0];
      updateMusethesiaChordInfo(chord,NOTES_ACC[chord]||[],0);
      musethesiaSetChord(chord);
    }
    if(isPlaying)startMusesthesia();
  }else{
    stopMusesthesia();museThesiaActive=false;
    if(isPlaying)startScheduler();
    view.style.display='none';main.style.display='grid';bottomBar.style.display='flex';
    btn.textContent='🎹 Musethesia';
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
  if(e.code==='KeyM'){e.preventDefault();metronomeOn=!metronomeOn;const mb=document.getElementById('metroBtn');if(mb)mb.classList.toggle('on',metronomeOn);}
  if(e.code==='F11'){e.preventDefault();toggleFullscreen();}
});

// ─── MIDI ────────────────────────────────────────────────────────────────────
(async function initMIDI() {
    await midi.init();
})();

document.addEventListener('midi-note-on', ((e) => {
    const { note } = e.detail;
    const el = document.querySelector(`[data-midi="${note}"]`);
    if (el) el.classList.add('midi-active');
}) as EventListener);

document.addEventListener('midi-note-off', ((e) => {
    const { note } = e.detail;
    const el = document.querySelector(`[data-midi="${note}"]`);
    if (el) el.classList.remove('midi-active');
}) as EventListener);

document.addEventListener('midi-devices-changed', ((e) => {
    const { count } = e.detail;
    console.log(`📡 ${count} périphérique(s) MIDI`);
    const el = document.getElementById('midi-count');
    if (el) el.textContent = String(count);
}) as EventListener);

console.log('🎵 MuseJam-Desktop prêt !');
