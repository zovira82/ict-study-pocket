(() => {
  'use strict';
  const DATA = window.ICT_DATA;
  const questions = DATA.questions;
  const questionById = new Map(questions.map(question => [question.id, question]));
  const originalIds = new Set(DATA.originalIds || questions.map(question => question.id));
  const publicIds = new Set(DATA.publicIds || []);
  const pastIds = new Set(DATA.pastIds || []);
  const bankIds = {original:originalIds, public:publicIds, past:pastIds};
  const bankNames = {original:'原题库', public:'公开补充题', past:'历年练习'};
  const practiceRoute = bank => bank==='original'?'study':bank==='all'?'practice':`${bank}-practice`;
  const queueBank = key => ['public','past','all'].find(bank=>key.endsWith(`|${bank}`))||'original';
  const marksBank = key => key.startsWith('public|')?'public':key.startsWith('past|')?'past':'original';
  const concepts = DATA.concepts;
  const conceptById = new Map(concepts.map(concept => [concept.id, concept]));
  const chapters = DATA.chapters || [];
  const sections = chapters.flatMap(chapter => chapter.sections.map(section => ({...section, chapter:chapter.id})));
  const sectionById = new Map(sections.map(section => [section.id, section]));
  const topics = DATA.topics;
  const STORAGE_KEY = 'zhixu-ict-v1';
  const SITE_URL = /^https?:$/.test(location.protocol)?`${location.origin}${location.pathname}`:'https://ict-study-pocket-35880.decentblade3.chatgpt.site/';
  const DAY = 86400000;
  const main = document.getElementById('main');
  const overlayRoot = document.getElementById('overlay-root');
  const icons = {
    book:'<path d="M12 5v16M3 3h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5v16h-5a4 4 0 0 0-4 2 4 4 0 0 0-4-2H3z"/>',
    pen:'<path d="m15 4 5 5M4 20l5-1L21 7a2 2 0 0 0-5-5L4 14zM4 20h16"/>',
    exam:'<rect x="5" y="5" width="14" height="17" rx="2"/><rect x="9" y="2" width="6" height="5" rx="1"/><path d="m8 14 3 3 5-6"/>',
    user:'<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',
    search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
    arrow:'<path d="M4 12h16m-6-6 6 6-6 6"/>',
    back:'<path d="m14 5-7 7 7 7"/>',
    chevron:'<path d="m9 5 7 7-7 7"/>',
    close:'<path d="m6 6 12 12M6 18 18 6"/>',
    check:'<path d="m5 12 4 4L19 6"/>',
    grid:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    star:'<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9z"/>',
    note:'<path d="M14 3H5v18h14V8zM14 3v5h5M8 12h8M8 16h6"/>',
    refresh:'<path d="M20 7a9 9 0 1 0 1 8M20 2v6h-6"/>',
    route:'<circle cx="5" cy="5" r="2"/><circle cx="19" cy="19" r="2"/><path d="M7 5h10a4 4 0 0 1 0 8H7a3 3 0 0 0 0 6h10"/>',
    layers:'<path d="m12 3 10 5-10 5L2 8zm-10 9 10 5 10-5M2 16l10 5 10-5"/>',
    shield:'<path d="m12 2 9 4v6c0 5-9 10-9 10S3 17 3 12V6z"/><path d="m8 12 3 3 5-6"/>',
    wifi:'<path d="M2 8a16 16 0 0 1 20 0M5 12a11 11 0 0 1 14 0m-11 4a6 6 0 0 1 8 0"/><circle cx="12" cy="20" r=".5"/>',
    server:'<rect x="3" y="3" width="18" height="7" rx="2"/><rect x="3" y="14" width="18" height="7" rx="2"/><path d="M7 6.5h.01M7 17.5h.01M16 6.5h2M16 17.5h2"/>',
    cloud:'<path d="M7 19a5 5 0 1 1 0-10 7 7 0 0 1 13-2 6 6 0 0 1-1 12z"/>',
    code:'<path d="m8 6-6 6 6 6m8-12 6 6-6 6M14 3l-4 18"/>',
    globe:'<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/>',
    flag:'<path d="M5 22V3c5-4 9 4 15 0v12c-6 4-10-4-15 0"/>',
    settings:'<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3"/><circle cx="16" cy="17" r="3"/>',
    download:'<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
  };
  const icon = name => `<svg viewBox="0 0 24 24" aria-hidden="true">${icons[name] || icons.book}</svg>`;
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
  const e = escapeHtml;
  const button = (action, label, classes='btn', attributes='') => `<button type="button" data-action="${action}" class="${classes}" ${attributes}>${label}</button>`;
  const today = (time=Date.now()) => new Date(time).toLocaleDateString('sv-SE');
  const sameAnswer = (left,right) => [...left].sort().join('') === [...right].sort().join('');
  const uniqueId = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  function shuffle(items) {
    const result=[...items];
    for(let index=result.length-1;index>0;index--) {
      const other=Math.floor(Math.random()*(index+1));
      [result[index],result[other]]=[result[other],result[index]];
    }
    return result;
  }
  function defaults() {
    return {
      version:1, attempts:[], marks:{}, cards:{}, notes:{}, notebook:'', favorites:[], publicFavorites:[], pastFavorites:[], history:[],
      queues:{}, activeExam:null,
      study:{topic:'all',type:'all',order:'sequential',mode:'memory',section:null,bank:'original'},
      ui:{chapter:'foundation',knowledgeView:'notes',openSection:null,recordBank:'original',studyFiltersOpen:false,publicView:'past',pastYear:'all'},
      settings:{font:'normal'}, updated:0,
    };
  }
  function normalizeState(saved) {
    const base=defaults();
    if(!saved || saved.version!==1 || !Array.isArray(saved.attempts)) return base;
    const result={...base,...saved,study:{...base.study,...saved.study},ui:{...base.ui,...saved.ui},settings:{...base.settings,...saved.settings}};
    result.attempts=result.attempts.filter(attempt=>questionById.has(attempt.question)&&Array.isArray(attempt.selected));
    if(saved.session?.exam && !result.activeExam) {
      result.activeExam={...saved.session, answers:saved.session.selections||{},flags:saved.session.flags||{}};
    }
    if(saved.session&&!saved.session.exam&&!saved.study) {
      const ids=questions.map(question=>question.id);
      const current=saved.session.ids[saved.session.index];
      result.queues['all|all|sequential|']={ids,index:Math.max(0,ids.indexOf(current)),answers:saved.session.answers||{},selections:saved.session.selections||{},guesses:saved.session.guesses||{},viewed:{},updated:Date.now()};
      result.study.mode=saved.session.memory?'memory':'practice';
    }
    result.notebook=typeof saved.notebook==='string'?saved.notebook:'';
    delete result.session;
    updateCorrectedAnswers(result);
    return result;
  }
  function updateCorrectedAnswers(saved, force=false) {
    if(!DATA.answerUpdateVersion||(!force&&saved.answerUpdateVersion===DATA.answerUpdateVersion))return;
    const changed=new Set(DATA.answerUpdateIds||[]);
    const marks=new Map();
    for(const attempt of [...saved.attempts].sort((left,right)=>left.time-right.time)){
      if(!changed.has(attempt.question))continue;
      const question=questionById.get(attempt.question);
      if(!question||!Array.isArray(attempt.selected))continue;
      attempt.correct=sameAnswer(attempt.selected,question.answer);
      const bank=attempt.bank||'original';
      const key=bank==='original'?question.id:`${bank}|${question.id}`;
      const mark=marks.get(key)||{pending:false,failures:0,streak:0,lastPassDay:''};
      if(!attempt.correct||attempt.guessed){
        mark.pending=true;mark.streak=0;mark.lastError=attempt.time;
        if(!attempt.correct)mark.failures++;
      }else if(mark.pending&&mark.lastPassDay!==today(attempt.time)&&today(mark.lastError)!==today(attempt.time)){
        mark.streak++;mark.lastPassDay=today(attempt.time);
        if(mark.streak>=2)mark.pending=false;
      }
      mark.updated=attempt.time;marks.set(key,mark);
    }
    for(const [key,mark] of marks)saved.marks[key]=mark;
    const updateAnswer=(id,answer)=>{
      if(changed.has(id)&&questionById.has(id)&&Array.isArray(answer?.selected))answer.correct=sameAnswer(answer.selected,questionById.get(id).answer);
    };
    for(const queue of Object.values(saved.queues||{})){
      for(const [id,answer] of Object.entries(queue.answers||{}))updateAnswer(id,answer);
    }
    for(const report of saved.history||[]){
      if(!Array.isArray(report.ids)||!report.answers)continue;
      for(const [id,answer] of Object.entries(report.answers))updateAnswer(id,answer);
      report.correct=report.ids.filter(id=>report.answers[id]?.correct).length;
      report.score=report.ids.length?Math.round(report.correct/report.ids.length*100):0;
    }
    saved.answerUpdateVersion=DATA.answerUpdateVersion;
  }
  function loadState() {
    try {return normalizeState(JSON.parse(localStorage.getItem(STORAGE_KEY)||'null'));}
    catch {return defaults();}
  }
  let state=loadState();
  let route='study';
  let collection='wrong';
  let collectionLimit=50;
  let mapPage=0;
  let modalFocus=null;
  let toastTimer;
  let nextQuestionTimer;
  let questionSwipe=null;
  let swipeClickUntil=0;
  let reportId=null;
  let flashIds=[];
  let flashIndex=0;
  let flashRevealed=false;
  let installEvent=null;
  let examSettings={topic:'all',count:30,minutes:30,types:['单选','多选','判断'],bank:'original'};
  let questionStart=Date.now();
  const navItems=[['study','pen','题库'],['knowledge','book','知识'],['public','layers','历年题'],['exam','exam','考试'],['records','user','记录']];
  function save() {
    state.updated=Date.now();
    try {localStorage.setItem(STORAGE_KEY,JSON.stringify(state));return true;}
    catch {toast('保存失败，请导出备份后检查浏览器存储。');return false;}
  }
  function toast(message) {
    const element=document.getElementById('toast');
    element.textContent=message;element.classList.add('visible');
    clearTimeout(toastTimer);toastTimer=setTimeout(()=>element.classList.remove('visible'),2800);
  }
  function topicName(id) {return topics.find(topic=>topic.id===id)?.name||'全部知识点';}
  function bankContains(question,bank='original') {
    return bank==='all'||(bankIds[bank]||originalIds).has(question.id);
  }
  function effectiveBank(id,bank=state.study.bank) {
    return bank==='all'?(questionById.get(id)?.bank||'original'):(bank||'original');
  }
  function markKey(id,bank=state.study.bank) {
    const actual=effectiveBank(id,bank);
    return actual==='original'?id:`${actual}|${id}`;
  }
  function favoriteIds(bank=state.study.bank) {
    if(bank==='all')return [...new Set([...state.favorites,...state.publicFavorites,...state.pastFavorites])];
    return state[bank==='original'?'favorites':`${bank}Favorites`]||[];
  }
  function queueKey() {
    const values=[state.study.topic,state.study.type,state.study.order,state.study.section||''];
    if(state.study.bank&&state.study.bank!=='original')values.push(state.study.bank);
    return values.join('|');
  }
  function seenIds(bank=state.study.bank) {
    return new Set(state.attempts.filter(attempt=>attempt.selected.length&&(bank==='all'||(attempt.bank||'original')===(bank||'original'))).map(attempt=>attempt.question));
  }
  function availableQuestions() {
    const settings=state.study;
    const seen=seenIds();
    const pool=['public','past'].includes(settings.bank)?[...bankIds[settings.bank]].map(id=>questionById.get(id)):questions;
    return pool.filter(question=>{
      if(!bankContains(question,settings.bank))return false;
      if(!sectionById.has(settings.section)&&settings.topic!=='all'&&question.topic!==settings.topic)return false;
      if(settings.type!=='all'&&question.type!==settings.type)return false;
      if(settings.section&&sectionById.has(settings.section)&&!question.sections?.includes(settings.section))return false;
      if(settings.customIds&&!settings.customIds.includes(question.id))return false;
      if(settings.order==='wrong'&&!state.marks[markKey(question.id)]?.pending)return false;
      if(settings.order==='wrong-random'&&!state.marks[markKey(question.id)]?.pending)return false;
      if(settings.order==='favorites'&&!favoriteIds().includes(question.id))return false;
      if(settings.order==='unseen'&&seen.has(question.id))return false;
      return true;
    });
  }
  function ensureQueue(refresh=false) {
    const key=queueKey();
    let queue=state.queues[key];
    const dynamic=['wrong','wrong-random','favorites'].includes(state.study.order);
    if(!queue||refresh||queue.revision!==DATA.version||(dynamic&&queue.ids.some(id=>!questionById.has(id)))) {
      const current=queue?.ids[queue.index];
      let ids=availableQuestions().map(question=>question.id);
      if(['random','wrong-random'].includes(state.study.order))ids=shuffle(ids);
      queue={ids,index:Math.max(0,ids.indexOf(current)),answers:queue?.answers||{},selections:queue?.selections||{},guesses:queue?.guesses||{},viewed:queue?.viewed||{},updated:Date.now(),revision:DATA.version};
      state.queues[key]=queue;save();
    }
    if(queue.index>=queue.ids.length)queue.index=Math.max(0,queue.ids.length-1);
    return queue;
  }
  function currentStudyQuestion() {
    const queue=ensureQueue();return questionById.get(queue.ids[queue.index]);
  }
  function navigate(next) {
    closeModal();
    if(location.hash===`#${next}`){route=next;render();window.scrollTo(0,0);}
    else location.hash=next;
  }
  function readRoute() {
    const value=location.hash.slice(1);
    if(['public-practice','past-practice'].includes(value)){state.study.bank=value.split('-')[0];return 'study';}
    if(value==='study'||value==='home')state.study.bank='original';
    return ({home:'study',practice:'study',session:'study',profile:'records',review:'records',result:'report'})[value]||(['study','knowledge','public','exam','records','report','notebook'].includes(value)?value:'study');
  }
  function renderNavigation() {
    const active=route==='notebook'?'records':route==='report'?'exam':route==='study'&&['public','past'].includes(state.study.bank)?'public':route;
    const links=navItems.map(([id,name,label])=>`<a href="#${id}" class="${active===id?'active':''}" ${active===id?'aria-current="page"':''}>${label}</a>`).join('');
    document.getElementById('app-header').innerHTML=`<div class="header-inner"><a class="brand" href="#study">${icon('book')}<span>知序</span></a><span class="app-subtitle">ICT 网络赛道</span><nav class="desktop-nav" aria-label="主要导航">${links}</nav></div>`;
    document.getElementById('bottomnav').innerHTML=navItems.map(([id,name,label])=>`<a href="#${id}" class="${active===id?'active':''}" ${active===id?'aria-current="page"':''}>${icon(name)}<span>${label}</span></a>`).join('');
    document.body.classList.toggle('font-large',state.settings.font==='large');
    document.body.classList.toggle('memory-study',route==='study'&&state.study.mode==='memory');
    document.body.classList.toggle('show-study-filters',!!state.ui.studyFiltersOpen);
    document.body.classList.toggle('notebook-open',route==='study'&&!!state.ui.notebookOpen);
  }
  function render() {
    clearTimeout(nextQuestionTimer);
    renderNavigation();
    const screens={study:renderStudy,knowledge:renderKnowledge,public:renderPublicBank,exam:renderExam,records:renderRecords,report:renderReport,notebook:renderNotebook};
    main.innerHTML=screens[route]();
    document.title=`${navItems.find(item=>item[0]===route)?.[2]||(route==='notebook'?'学习笔记':'考试结果')} · 知序`;
  }
  function title(text,extra='') {
    return `<div class="page-title"><h1>${text}</h1><div class="row">${extra}${button('search',icon('search'),'icon-btn','aria-label="搜索题目和知识"')}</div></div>`;
  }
  function topicOptions(selected) {
    return `<option value="all">全部知识点</option>${topics.map(topic=>`<option value="${topic.id}" ${selected===topic.id?'selected':''}>${topic.name}</option>`).join('')}`;
  }
  function empty(text,action='',label='') {
    return `<section class="empty">${icon('book')}<h3>${text}</h3>${action?`<div class="mt">${button(action,label,'btn soft')}</div>`:''}</section>`;
  }
  function renderStudy() {
    const queue=ensureQueue();
    const settings=state.study;
    const question=questionById.get(queue.ids[queue.index]);
    if(question&&settings.mode==='memory'&&!queue.viewed[question.id]){
      queue.viewed[question.id]=Date.now();queue.updated=Date.now();save();
    }
    const section=sectionById.get(settings.section);
    return `<section class="study-top">${settings.bank!=="original"&&settings.bank!=="all"?`<div class="study-bank-title"><span>${bankNames[settings.bank]}</span>${button("public-home","题库目录","text-btn")}</div>`:""}<div class="toolbar"><div class="segmented" aria-label="学习方式">${button('study-mode','背题',settings.mode==='memory'?'active':'','data-value="memory" aria-pressed="'+(settings.mode==='memory')+'"')}${button('study-mode','刷题',settings.mode==='practice'?'active':'','data-value="practice" aria-pressed="'+(settings.mode==='practice')+'"')}</div><span class="count">${queue.ids.length?`${queue.index+1} / ${queue.ids.length}`:'0 题'}</span>${button('notebook-toggle','笔记','text-btn notebook-toggle','aria-label="学习笔记" aria-expanded="'+!!state.ui.notebookOpen+'"')}${button('search',icon('search'),'icon-btn','aria-label="搜索题目和知识"')}${button('study-filters-toggle',icon('settings'),'icon-btn compact-filter-toggle','aria-label="展开或收起筛选" aria-expanded="'+!!state.ui.studyFiltersOpen+'"')}${button('answer-map',icon('grid'),'icon-btn','aria-label="打开答题卡"')}</div><div class="study-filters"><select id="study-topic" aria-label="知识范围">${topicOptions(settings.topic)}${settings.section?`<option value="section" selected>${e(section?.title||settings.label||"专项练习")}</option>`:''}</select><select id="study-type" aria-label="题型">${[['all','全部题型'],['单选','单选题'],['多选','多选题'],['判断','判断题']].map(([id,label])=>`<option value="${id}" ${settings.type===id?'selected':''}>${label}</option>`).join('')}</select><select id="study-order" aria-label="练习顺序">${[['sequential','顺序'],['random','随机'],['unseen','未做题'],['wrong','错题顺序'],['wrong-random','错题随机'],['favorites','收藏']].map(([id,label])=>`<option value="${id}" ${settings.order===id?'selected':''}>${label}</option>`).join('')}</select></div><div class="progress"><i style="width:${queue.ids.length?(queue.index+1)/queue.ids.length*100:0}%"></i></div></section>${question?`<div class="study-workspace"><div class="study-question-column"><div class="study-question-pane">${renderQuestion(question,queue,false)}</div><div class="question-footer">${button('previous',`${icon('back')} 上一题`,'btn secondary',queue.index===0?'disabled':'')}${button('study-settings',icon('settings'),'icon-btn','aria-label="练习设置与重置"')}${button('next',`下一题 ${icon('arrow')}`,'btn',queue.index===queue.ids.length-1?'disabled':'')}</div></div>${state.ui.notebookOpen?renderNotebookPanel():''}</div>`:empty('当前范围没有题目','all-questions','返回全部题目')}`;
  }
  function relatedSections(question) {
    const ids=question.sections||[];
    return ids.map(id=>sectionById.get(id)).filter(Boolean).slice(0,3);
  }
  function renderQuestion(question,queue,exam) {
    const memory=!exam&&state.study.mode==='memory';
    const response=exam?null:queue.answers[question.id];
    const selected=(exam?queue.answers[question.id]:queue.selections[question.id])||[];
    const showAnswer=memory||!!response;
    const related=relatedSections(question);
    return `<article class="question"><div class="question-meta"><span class="tag">${question.type}题</span><span>${question.id}</span><span>${topicName(question.topic)}</span><span class="spacer"></span>${exam?button('flag',icon('flag'),`icon-btn ${queue.flags[question.id]?'saved':''}`,'aria-label="标记存疑"'):button('favorite',icon('star'),`icon-btn ${favoriteIds().includes(question.id)?'saved':''}`,'aria-label="收藏本题"')}${button('note',icon('note'),'icon-btn','aria-label="题目笔记"')}</div><h2 class="question-stem">${e(question.stem)}</h2>${question.supplement?`<div class="supplement">${e(question.supplement)}</div>`:''}${question.image?`<img class="question-image" src="${e(question.image)}" alt="本题拓扑图">`:''}<div class="options" role="group" aria-label="答案选项">${question.options.map(option=>{
      const chosen=selected.includes(option.id);
      const correct=question.answer.includes(option.id);
      const status=showAnswer?(correct?'correct':chosen?'wrong':''):(chosen?'selected':'');
      return button('select-option',`${question.type==='判断'?'':`<span class="option-letter">${option.id}</span>`}<span class="option-text">${e(option.text)}</span>${showAnswer&&correct?icon('check'):showAnswer&&chosen?icon('close'):''}`,`option ${status}`,`data-id="${option.id}" aria-pressed="${chosen}" ${showAnswer?'disabled':''}`);
    }).join('')}</div>${!showAnswer?`<div class="answer-actions"><label class="check"><input id="guess-answer" type="checkbox" ${queue.guesses?.[question.id]?'checked':''}>这题我是猜的</label>${exam?'<span class="tiny muted">已自动保存选择</span>':question.type==='多选'?button('submit-answer','提交答案','btn',selected.length?'':'disabled'):''}</div>`:''}${showAnswer?`<section class="explanation"><div class="answer-heading ${response&&!response.correct?'wrong':''}">${icon(response&&!response.correct?'refresh':'check')}<strong>${memory?'答案与解析':response.correct?'答对了':'本题答错'}</strong><span>答案 ${answerLabel(question)}</span></div>${renderExplanationContent(question)}</section>`:''}${!exam&&related.length?`<div class="related" aria-label="相关知识点">${related.map(section=>button('open-section',`${icon('book')}${e(section.title)}`,'',`data-id="${section.id}"`)).join('')}</div>`:!exam&&question.concepts?.length?`<div class="related">${question.concepts.slice(0,3).map(id=>conceptById.get(id)).filter(Boolean).map(concept=>button('concept',`${icon('book')}${e(concept.title)}`,'',`data-id="${concept.id}"`)).join('')}</div>`:''}${!exam?button('ask-ai','问 AI','btn secondary ai-entry',`data-id="${question.id}"`)+renderQuestionSources(question):''}</article>`;
  }
  function renderExplanationContent(question) {
    const quick = question.quickExplanation || question.explanation;
    const details = question.quickExplanation && question.quickExplanation !== question.explanation
      ? `<details class="explanation-details"><summary>展开理解</summary><p>${e(question.explanation)}</p></details>`
      : '';
    return `<p class="quick-explanation">${e(quick)}</p>${details}`;
  }
  function answerLabel(question) {return question.type==='判断'?(question.answer[0]==='T'?'正确':'错误'):[...question.answer].sort().join('、');}
  function recordAnswer(question,selected,guessed,mode,requestedBank=state.study.bank) {
    const correct=sameAnswer(selected,question.answer);
    const now=Date.now();
    const bank=effectiveBank(question.id,requestedBank);
    const attempt={id:uniqueId(),question:question.id,selected:[...selected],correct,guessed:!!guessed,time:now,duration:Math.max(0,now-questionStart),mode,bank};
    state.attempts.push(attempt);
    const key=markKey(question.id,bank);
    const mark=state.marks[key]||{pending:false,failures:0,streak:0,lastPassDay:''};
    if(!correct||guessed){
      mark.pending=true;mark.streak=0;mark.lastError=now;
      if(!correct)mark.failures++;
    }else if(mark.pending&&mark.lastPassDay!==today()&&today(mark.lastError)!==today()){
      mark.streak++;mark.lastPassDay=today();
      if(mark.streak>=2)mark.pending=false;
    }
    mark.updated=now;state.marks[key]=mark;
    return attempt;
  }
  function submitAnswer() {
    const queue=ensureQueue();const question=currentStudyQuestion();
    const selected=queue.selections[question.id]||[];
    if(!selected.length||queue.answers[question.id])return;
    const response=recordAnswer(question,selected,queue.guesses[question.id],'practice');
    queue.answers[question.id]=response;
    queue.updated=Date.now();
    const saved=save();
    render();
    if(!saved||!response.correct||queue.index===queue.ids.length-1)return;
    const index=queue.index;
    nextQuestionTimer=setTimeout(()=>{
      if(route==='study'&&state.study.mode==='practice'&&!overlayRoot.firstChild&&ensureQueue()===queue&&queue.index===index)moveQuestion(index+1);
    },250);
  }
  function moveQuestion(index) {
    const queue=activeQueue();
    if(index<0||index>=queue.ids.length)return;
    queue.index=index;queue.updated=Date.now();questionStart=Date.now();save();closeModal();render();window.scrollTo(0,0);
  }
  function activeQueue() {return route==='exam'&&state.activeExam?state.activeExam:ensureQueue();}
  function activeQuestion() {const queue=activeQueue();return questionById.get(queue.ids[queue.index]);}
  function startScope(topic='all',mode=state.study.mode,section=null) {
    state.study={...state.study,topic,type:'all',order:'sequential',mode,section,customIds:null,label:null,bank:'all'};
    ensureQueue(true);save();navigate('practice');
  }
  function renderKnowledge() {
    const view=state.ui.knowledgeView;
    const chapter=chapters.find(item=>item.id===state.ui.chapter)||chapters[0];
    return `${title('知识',button('knowledge-sources','范围与来源','text-btn'))}<div class="knowledge-top"><div class="segmented">${button('knowledge-view','知识笔记',view==='notes'?'active':'','data-value="notes"')}${button('knowledge-view','分类练习',view==='practice'?'active':'','data-value="practice"')}</div>${button('flash','术语速记','text-btn')}</div>${view==='practice'?`<div class="topic-list">${topics.map(topic=>{
      const pool=questions.filter(question=>question.topic===topic.id);
      const seen=seenIds('all');
      return `<div class="topic-row">${icon(topic.icon)}<span><h3>${topic.name}</h3><p>${pool.length} 题 · 已做 ${pool.filter(question=>seen.has(question.id)).length} 题</p></span><span class="actions">${button('topic-study','背题','btn soft small',`data-id="${topic.id}" data-mode="memory"`)}${button('topic-study','刷题','btn secondary small',`data-id="${topic.id}" data-mode="practice"`)}</span></div>`;
    }).join('')}</div>`:chapter?`<div class="chapter-tabs" aria-label="知识章节">${chapters.map(item=>button('chapter',item.title,item.id===chapter.id?'active':'',`data-id="${item.id}"`)).join('')}</div><div class="chapter-heading"><h2>${e(chapter.title)}</h2><p>${e(chapter.subtitle)}</p></div><div class="note-sections">${chapter.sections.map((section,index)=>`<details class="note-section" id="note-${section.id}" ${state.ui.openSection===section.id?'open':''}><summary><span class="section-index">${String(index+1).padStart(2,'0')}</span>${e(section.title)}</summary>${renderNoteBody(section)}</details>`).join('')}</div>`:empty('知识笔记正在载入')}`;
  }
  function renderNoteBody(section) {
    const count=questions.filter(question=>question.sections?.includes(section.id)).length;
    const sourceUrls=(section.sources||[]).map(source=>typeof source==='string'?source:source.url);
    return `<div class="note-body">${(section.paragraphs||[]).map(paragraph=>`<p>${e(paragraph)}</p>`).join('')}${section.memory?`<div class="note-memory"><span class="note-label">记忆</span>${e(section.memory)}</div>`:''}${section.contrast?`<div class="note-contrast"><span class="note-label">易混</span>${e(section.contrast)}</div>`:''}${section.example?`<details class="note-extra"><summary>看个例子</summary><p>${e(section.example)}</p></details>`:''}${section.prerequisites?.length?`<div class="prerequisites"><span>先了解</span>${section.prerequisites.map(id=>sectionById.get(id)).filter(Boolean).map(item=>button("open-section",e(item.title),"text-btn",`data-id="${item.id}"`)).join("")}</div>`:''}<div class="note-bottom">${button('section-practice',`练关联题 · ${count} 题 ${icon('arrow')}`,'btn soft small',`data-id="${section.id}" ${count?'':'disabled'}`)}${button('section-memory','背关联题','text-btn',`data-id="${section.id}" ${count?'':'disabled'}`)}</div>${sourceUrls.length?`<details class="sources"><summary>参考资料</summary>${[...new Set(sourceUrls)].filter(url=>/^https:\/\//.test(url)).map((url,index)=>`<a href="${e(url)}" target="_blank" rel="noopener noreferrer">${sourceTitle(url,index)}</a>`).join('')}</details>`:''}</div>`;
  }
  function sourceTitle(url,index) {
    const source=(DATA.sources||[]).find(item=>item.url===url);
    return e(source?.title||`华为官方参考资料 ${index+1}`);
  }
  function openSection(id) {
    const section=sectionById.get(id);if(!section)return;
    openModal('相关知识',`<h3 class="note-title">${e(section.title)}</h3>${renderNoteBody(section)}<div class="modal-footer">${button('close-modal','返回题目','btn secondary')}${button('view-chapter','查看本章','btn',`data-id="${id}"`)}</div>`);
  }
  function openConcept(id) {
    const concept=conceptById.get(id);if(!concept)return;
    const related=sections.find(section=>(section.terms||[]).some(term=>concept.title.toLowerCase().includes(term.toLowerCase())));
    if(related){openSection(related.id);return;}
    openModal(concept.title,`<p>${e(concept.summary)}</p><div class="note-memory">${e(concept.memory)}</div>${concept.example?`<p>${e(concept.example)}</p>`:''}${concept.contrast?`<p>${e(concept.contrast)}</p>`:''}<div class="modal-footer">${button('close-modal','返回','btn secondary')}${button('concept-practice','练关联题','btn',`data-id="${id}"`)}</div>`);
  }
  function startFlash() {
    const available=concepts.filter(concept=>state.ui.chapter==='all'||concept.topic===state.ui.chapter);
    flashIds=shuffle(available.length?available:concepts).map(concept=>concept.id).slice(0,20);
    flashIndex=0;flashRevealed=false;renderFlash();
  }
  function renderFlash() {
    const concept=conceptById.get(flashIds[flashIndex]);
    if(!concept){openModal('已完成本组背诵',`<p>共 ${flashIds.length} 个术语。</p><div class="modal-footer">${button('close-modal','完成','btn')}</div>`);return;}
    openModal(`术语速记 · ${flashIndex+1} / ${flashIds.length}`,`<h3 class="flash-title">${e(concept.title)}</h3>${flashRevealed?`<p>${e(concept.summary)}</p><div class="note-memory">${e(concept.memory)}</div><div class="modal-footer">${button('flash-rate','没记住','btn secondary','data-level="1"')}${button('flash-rate','记住了','btn','data-level="3"')}</div>`:button('flash-reveal','查看解释','btn wide')}`);
  }
  function renderExam() {
    if(state.activeExam) {
      const exam=state.activeExam;
      const question=questionById.get(exam.ids[exam.index]);
      return `<div class="study-top"><div class="exam-header"><h2>模拟考试</h2><span class="spacer"></span><span class="timer" id="exam-timer">${formatTime(exam.deadline-Date.now())}</span>${button('answer-map',icon('grid'),'icon-btn','aria-label="打开考试答题卡"')}${button('confirm-submit','交卷','text-btn')}</div><div class="row between"><span class="tiny muted">${exam.index+1} / ${exam.ids.length}</span><span class="tiny muted">退出后计时继续</span></div><div class="progress"><i style="width:${(exam.index+1)/exam.ids.length*100}%"></i></div></div>${renderQuestion(question,exam,true)}<div class="question-footer">${button('previous',`${icon('back')} 上一题`,'btn secondary',exam.index===0?'disabled':'')}<span></span>${exam.index===exam.ids.length-1?button('confirm-submit','交卷','btn'):button('next',`下一题 ${icon('arrow')}`,'btn')}</div>`;
    }
    const history=state.history.filter(item=>item.exam);
    return `${title('模拟考试')}<section class="exam-panel"><h3>随机组卷</h3><div class="exam-fields"><div class="field full"><label for="exam-bank">题目来源</label><select id="exam-bank">${[["original","原题库"],["public","公开补充题"],["past","历年练习"],["all","全部去重题目"]].map(([id,label])=>`<option value="${id}" ${examSettings.bank===id?"selected":""}>${label}</option>`).join("")}</select></div><div class="field full"><label for="exam-topic">知识范围</label><select id="exam-topic">${topicOptions(examSettings.topic)}</select></div><div class="field"><label for="exam-count">题目数量</label><select id="exam-count">${[10,20,30,50,100].map(count=>`<option value="${count}" ${examSettings.count===count?'selected':''}>${count} 题</option>`).join('')}</select></div><div class="field"><label for="exam-minutes">考试时长</label><select id="exam-minutes">${[10,20,30,45,60,90,120].map(minutes=>`<option value="${minutes}" ${examSettings.minutes===minutes?'selected':''}>${minutes} 分钟</option>`).join('')}</select></div><div class="field full"><label>包含题型</label><div class="pills">${['单选','多选','判断'].map(type=>button('exam-type',`${examSettings.types.includes(type)?'✓ ':''}${type}题`,`pill ${examSettings.types.includes(type)?'active':''}`,`data-value="${type}"`)).join('')}</div></div></div><p class="exam-rules">自主练习卷，每题等权计分。多选题漏选、错选均不得分。考试到时自动交卷。</p>${button('start-exam','开始考试','btn wide',examSettings.types.length?'':'disabled')}</section><h3 class="mt">考试记录</h3>${history.length?`<div class="history-list">${history.slice(0,20).map(report=>button('report',`<strong class="history-score">${report.score}</strong><span><p>${e(report.label)}</p><small>${new Date(report.time).toLocaleDateString('zh-CN')} · ${report.total} 题</small></span>${icon('chevron')}`,'history-row',`data-id="${report.id}"`)).join('')}</div>`:'<p class="small muted mt">暂无考试记录</p>'}`;
  }
  function beginExam() {
    const groups=examSettings.types.map(type=>shuffle(questions.filter(question=>bankContains(question,examSettings.bank)&&question.type===type&&(examSettings.topic==='all'||question.topic===examSettings.topic))));
    const candidates=[];
    while(groups.some(group=>group.length))groups.forEach(group=>{if(group.length)candidates.push(group.pop());});
    const seen=new Set();const ids=[];
    for(const question of candidates){
      const normalized=question.stem.replace(/\s/g,'');
      if(seen.has(normalized))continue;
      seen.add(normalized);ids.push(question.id);
      if(ids.length===examSettings.count)break;
    }
    if(!ids.length){toast('当前范围没有可用题目。');return;}
    state.activeExam={id:uniqueId(),ids:shuffle(ids),index:0,answers:{},guesses:{},flags:{},started:Date.now(),deadline:Date.now()+examSettings.minutes*60000,label:examSettings.topic==='all'?'综合模拟':topicName(examSettings.topic),bank:examSettings.bank};
    save();render();window.scrollTo(0,0);
    if(ids.length<examSettings.count)toast(`本次范围共有 ${ids.length} 道不同题目，已全部加入。`);
  }
  function formatTime(milliseconds) {
    const seconds=Math.max(0,Math.ceil(milliseconds/1000));
    return `${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;
  }
  function finishExam() {
    const exam=state.activeExam;if(!exam)return;
    const answers={};
    exam.ids.forEach(id=>{answers[id]=recordAnswer(questionById.get(id),exam.answers[id]||[],exam.guesses[id],'exam',exam.bank||'original');});
    const correct=Object.values(answers).filter(answer=>answer.correct).length;
    const report={id:exam.id,label:exam.label,bank:exam.bank||'original',exam:true,time:Date.now(),started:exam.started,ids:exam.ids,answers,correct,total:exam.ids.length,score:Math.round(correct/exam.ids.length*100)};
    state.history.unshift(report);state.history=state.history.slice(0,100);
    state.activeExam=null;reportId=report.id;save();navigate('report');
  }
  function renderReport() {
    const report=state.history.find(item=>item.id===reportId)||state.history[0];
    if(!report)return `${title('考试结果')}${empty('暂无考试记录')}`;
    const misses=report.ids.filter(id=>!report.answers[id]?.correct);
    return `${title('考试结果',button('exam-route','返回考试','text-btn'))}<section class="exam-panel"><div class="result-score"><strong>${report.score}</strong><small>分</small><p>${report.total} 题 · 答对 ${report.correct} 题 · 未答对 ${misses.length} 题</p></div><div class="result-actions">${misses.length?button('report-review','复习本次错题','btn',`data-id="${report.id}"`):''}${button('report-redo','重做这份试卷','btn secondary',`data-id="${report.id}"`)}</div>${topics.map(topic=>{
      const pool=report.ids.filter(id=>questionById.get(id)?.topic===topic.id);
      if(!pool.length)return '';
      return `<div class="result-topic"><span>${topic.name}</span><span>${pool.filter(id=>report.answers[id]?.correct).length} / ${pool.length}</span></div>`;
    }).join('')}</section><div class="question-list mt">${report.ids.map(id=>{
      const question=questionById.get(id);if(!question)return '';
      return button('report-question',`<span class="qid">${id}</span><span class="question-text">${e(question.stem)}<small>${report.answers[id]?.correct?'答对':'未答对'}</small></span>${icon('chevron')}`,'question-row',`data-id="${id}" data-report="${report.id}"`);
    }).join('')}</div>`;
  }
  function renderPublicBank() {
    const bank=state.ui.publicView==='public'?'public':'past';
    const year=state.ui.pastYear||'all';
    const selected=(DATA.pastCollections||[]).find(item=>item.id===year);
    const ids=bank==='past'&&selected?selected.ids:[...bankIds[bank]];
    const pool=ids.map(id=>questionById.get(id));
    const seen=seenIds(bank);
    const wrong=pool.filter(question=>state.marks[markKey(question.id,bank)]?.pending);
    const start=(label,classes,attributes='')=>button('public-start',label,classes,`data-bank="${bank}" data-year="${bank==='past'?year:'all'}" ${attributes}`);
    const tabs=`<div class="record-bank segmented">${button('public-view','历年练习',bank==='past'?'active':'','data-value="past"')}${button('public-view','公开补充',bank==='public'?'active':'','data-value="public"')}</div>`;
    const years=bank==='past'?`<div class="pills">${button('past-year','全部',year==='all'?'pill active':'pill','data-value="all"')}${(DATA.pastCollections||[]).map(item=>button('past-year',`${e(item.label)} · ${item.ids.length}`,year===item.id?'pill active':'pill',`data-value="${item.id}"`)).join('')}</div>`:'';
    const audit=DATA.publicBank||{};
    return `${title(bankNames[bank])}<section class="bank-content">${tabs}${years}
      <div class="record-stats">
        <div class="record-stat"><p>可练题目</p><strong>${pool.length}</strong></div>
        <div class="record-stat"><p>已练习</p><strong>${pool.filter(question=>seen.has(question.id)).length}</strong></div>
        <div class="record-stat"><p>待复习</p><strong>${wrong.length}</strong></div>
      </div>
      <div class="public-actions">
        ${start('背题','btn soft','data-mode="memory"')}
        ${start('刷题','btn','data-mode="practice"')}
        ${start('随机刷题','btn secondary','data-mode="practice" data-order="random"')}
        ${start('错题练习','btn secondary','data-mode="practice" data-order="wrong"')}
      </div>
      <p class="bank-description">${bank==='past'?'公开回忆考点与讲师讲解，含关联练习。':'公开样题与练习，已与原题库去重。'}</p>
      <div class="topic-list">${topics.map(topic=>{
        const count=pool.filter(question=>question.topic===topic.id).length;
        if(!count)return '';
        return `<div class="topic-row">${icon(topic.icon)}<span><h3>${topic.name}</h3><p>${count} 题</p></span><span class="actions">${start('背题','btn soft small',`data-topic="${topic.id}" data-mode="memory"`)}${start('刷题','btn secondary small',`data-topic="${topic.id}" data-mode="practice"`)}</span></div>`;
      }).join('')}</div>
      <details class="bank-sources"><summary>来源与去重记录</summary>${bank==='past'?`<p>公开资料对应题沿用原题号，考点改编题单独编号。题目同时进入相关知识点练习。</p>${(DATA.pastCollections||[]).map(item=>`<a href="${e(item.url)}" target="_blank" rel="noopener noreferrer">${e(item.label)} · ${e(item.kind)}</a>`).join('')}`:`<p>整理 ${audit.candidates||pool.length} 道，合并重复题 ${audit.duplicates||0} 道，新增 ${audit.added||0} 道。公开样题与练习均按各自出处标注。</p>${(audit.sources||[]).map(source=>`<a href="${e(source.url)}" target="_blank" rel="noopener noreferrer">${e(source.title)}</a>`).join('')}`}</details>
      <div class="section-title"><h3>题目目录</h3></div><div class="question-list">${pool.map(question=>renderQuestionRow(question)).join('')}</div></section>`;
  }
  function renderQuestionSources(question) {
    const references=[...(question.pastReferences||[]),...(question.publicReferences||[])];
    if(!references.length)return '';
    return `<details class="question-source"><summary>题目来源与校订</summary>${references.map(reference=>`<p>${e(reference.title)}<br>${e(reference.originalNumber||'')} · ${e(reference.kind||'公开练习')} · 题目按技术事实校订</p><a href="${e(reference.url)}" target="_blank" rel="noopener noreferrer">查看原出处</a>`).join('')}${question.verificationSources?.length?`<div class="sources">${question.verificationSources.map(source=>`<a href="${e(source.url)}" target="_blank" rel="noopener noreferrer">${e(source.title)}</a>`).join('')}</div>`:''}</details>`;
  }
  function renderRecords() {
    const bank=state.ui.recordBank;
    const pool=questions.filter(question=>bankContains(question,bank));
    const submitted=state.attempts.filter(attempt=>attempt.selected.length&&(attempt.bank||'original')===bank);
    const accuracy=submitted.length?`${Math.round(submitted.filter(attempt=>attempt.correct).length/submitted.length*100)}%`:'—';
    const wrong=pool.filter(question=>state.marks[markKey(question.id,bank)]?.pending);
    const favorites=favoriteIds(bank);
    const notes=pool.filter(question=>state.notes[question.id]);
    const list=collection==='favorites'?pool.filter(question=>favorites.includes(question.id)):collection==='notes'?notes:wrong;
    return `${title('学习记录',button('mobile',icon('globe'),'icon-btn','aria-label="在手机打开"'))}
      <div class="record-bank segmented">${button('record-bank','原题库',bank==='original'?'active':'','data-value="original"')}${button('record-bank','补充题',bank==='public'?'active':'','data-value="public"')}${button('record-bank','历年题',bank==='past'?'active':'','data-value="past"')}</div>
      <div class="record-stats">${[['已做题目',seenIds(bank).size],['作答正确率',accuracy],['待复习错题',wrong.length]].map(([label,value])=>`<div class="record-stat"><p>${label}</p><strong>${value}</strong></div>`).join('')}</div>
      <div class="settings">
        <div class="setting-row"><span><h3>答题字号</h3></span><select id="font-size" aria-label="答题字号"><option value="normal" ${state.settings.font==='normal'?'selected':''}>标准</option><option value="large" ${state.settings.font==='large'?'selected':''}>大字</option></select></div>
        <div class="setting-row"><span><h3>学习笔记</h3></span>${button('notebook-all','全部笔记','btn soft small')}</div>
        <div class="setting-row"><span><h3>学习备份</h3><p>保存在当前浏览器，更换设备可导入</p></span><div class="row">${button('export','导出','btn soft small')}${button('import','导入','btn secondary small')}<input type="file" id="import-file" accept="application/json,.json" hidden></div></div>
        <div class="setting-row"><span><h3>手机使用</h3><p>浏览器打开，可保存到桌面</p></span>${button('mobile','打开方式','btn soft small')}</div>
        <div class="setting-row"><span><h3>记录管理</h3><p>重置进度、清空错题或全部记录</p></span>${button('record-settings','管理','btn secondary small')}</div>
      </div>
      <div class="collection-tabs">${[['wrong',`错题 ${wrong.length}`],['favorites',`收藏 ${favorites.length}`],['notes',`笔记 ${notes.length}`]].map(([id,label])=>button('collection',label,`pill ${collection===id?'active':''}`,`data-value="${id}"`)).join('')}<span class="spacer"></span>${list.length?button('collection-study','练习','text-btn'):''}</div>
      ${list.length?`<div class="question-list">${list.slice(0,collectionLimit).map(question=>renderQuestionRow(question,collection==='notes'?state.notes[question.id]:'')).join('')}</div>${list.length>collectionLimit?button('more-collection','查看更多','btn soft wide mt'):''}`:'<p class="small muted">暂无记录</p>'}`;
  }
  function renderNotebookPanel(fullPage=false) {
    return `<aside class="learning-notebook" aria-label="学习笔记栏">
      <div class="notebook-heading"><h2>学习笔记</h2><span class="spacer"></span>
        ${fullPage?'':button('notebook-all','全部笔记','text-btn')}
        ${fullPage?'':button('notebook-close',icon('close'),'icon-btn','aria-label="收起学习笔记"')}
      </div>
      <textarea id="learning-notebook" aria-label="学习笔记内容" placeholder="写下自己的理解和记忆方法">${e(state.notebook)}</textarea>
      <span id="notebook-status" class="tiny muted" role="status">自动保存</span>
    </aside>`;
  }
  function renderNotebook() {
    const questionNotes=questions.filter(question=>state.notes[question.id]);
    return `${title('学习笔记',button('notebook-back','返回背题','text-btn'))}
      <section class="notebook-page">${renderNotebookPanel(true)}</section>
      ${questionNotes.length?`<h2 class="mt">题目笔记</h2><div class="notebook-question-notes">${questionNotes.map(question=>`
        <section class="notebook-note"><button type="button" data-action="jump-id" data-id="${question.id}" class="notebook-question-link">${e(question.id)} · ${e(question.stem)}</button><p>${e(state.notes[question.id])}</p></section>`).join('')}</div>`:''}`;
  }
  function renderQuestionRow(question,note='') {
    return button('jump-id',`<span class="qid">${question.id}</span><span class="question-text">${e(question.stem)}<small>${question.type}题 · ${topicName(question.topic)}</small>${note?`<small>${e(note)}</small>`:''}</span>${icon('chevron')}`,'question-row',`data-id="${question.id}"`);
  }
  function jumpToId(id) {
    if(!questionById.has(id))return;
    const preferred=route==='public'?(state.ui.publicView==='public'?'public':'past'):route==='records'?state.ui.recordBank:null;
    const bank=preferred&&bankIds[preferred]?.has(id)?preferred:(questionById.get(id).bank||'original');
    const selected=route==='public'&&bank==='past'?(DATA.pastCollections||[]).find(item=>item.id===state.ui.pastYear):null;
    state.study={topic:'all',type:'all',order:'sequential',mode:state.study.mode,section:selected?`past-${selected.id}`:null,customIds:selected?.ids||null,label:selected?.label||null,bank};
    const queue=ensureQueue();queue.index=queue.ids.indexOf(id);save();navigate(practiceRoute(bank));
  }
  function openModal(titleText,html) {
    if(!overlayRoot.firstChild)modalFocus=document.activeElement;
    overlayRoot.innerHTML=`<div class="overlay"><section class="modal" role="dialog" aria-modal="true" aria-label="${e(titleText)}" tabindex="-1"><div class="modal-header"><h2>${e(titleText)}</h2>${button('close-modal',icon('close'),'icon-btn','aria-label="关闭"')}</div>${html}</section></div>`;
    document.body.classList.add('no-scroll');overlayRoot.querySelector('.modal').focus();
  }
  function closeModal() {
    overlayRoot.innerHTML='';document.body.classList.remove('no-scroll');
    if(modalFocus?.isConnected)modalFocus.focus();
  }
  function openMap() {
    const queue=activeQueue();mapPage=Math.floor(queue.index/100);renderMap();
  }
  function renderMap() {
    const queue=activeQueue();const exam=route==='exam'&&state.activeExam;
    const pages=Math.ceil(queue.ids.length/100);
    const ids=queue.ids.slice(mapPage*100,(mapPage+1)*100);
    openModal('答题卡',`<div class="map-controls"><select id="map-page" aria-label="答题卡题号范围">${Array.from({length:pages},(_,index)=>`<option value="${index}" ${index===mapPage?'selected':''}>第 ${index*100+1}–${Math.min((index+1)*100,queue.ids.length)} 题</option>`).join('')}</select><input id="map-jump" class="jump-input" type="number" inputmode="numeric" min="1" max="${queue.ids.length}" placeholder="题号" aria-label="输入要跳转的序号">${button('map-go','跳转','btn secondary')}</div><div class="map-legend"><span><i></i>未答</span><span><i class="viewed"></i>${exam?'已选':'已背'}</span>${exam?'':'<span><i class="correct"></i>答对</span><span><i class="wrong"></i>答错</span>'}</div><div class="map-grid">${ids.map((id,offset)=>{
      const index=mapPage*100+offset;
      const answer=queue.answers[id];
      const status=exam?(answer?.length?'viewed':''):answer?(answer.correct?'correct':'wrong'):queue.viewed[id]?'viewed':'';
      return button('map-jump',index+1,`map-cell ${status} ${queue.index===index?'current':''} ${queue.flags?.[id]?'flagged':''}`,`data-index="${index}" title="${id}" aria-label="跳转第 ${index+1} 题 ${id}"`);
    }).join('')}</div>${exam?`<div class="modal-footer">${button('confirm-submit','交卷','btn')}</div>`:''}`);
  }
  function openStudySettings() {
    openModal('练习设置',`<div class="setting-row"><span><h3>重答当前题</h3></span>${button('redo-question','重答','btn soft small')}</div><div class="setting-row"><span><h3>重置当前范围进度</h3><p>回到第一题，历史作答统计保留</p></span>${button('confirm-reset','重置','btn secondary small','data-kind="queue"')}</div><div class="setting-row"><span><h3>重新随机排序</h3></span>${button('reshuffle','重新排序','btn secondary small')}</div>`);
  }
  function openRecordSettings() {
    openModal('记录管理',`<div class="setting-row"><span><h3>重置当前题库进度</h3><p>清空这类题库的题号进度与答题状态</p></span>${button('confirm-reset','重置','btn secondary small','data-kind="bank-progress"')}</div><div class="setting-row"><span><h3>清空当前题库错题</h3><p>历史作答与正确率保留</p></span>${button('confirm-reset','清空','btn secondary small','data-kind="wrong"')}</div><div class="setting-row"><span><h3>清空全部学习记录</h3><p>包括作答、考试、收藏和笔记</p></span>${button('confirm-reset','清空','btn danger small','data-kind="all"')}</div>`);
  }
  function confirmReset(kind) {
    const descriptions={'bank-progress':'将重置当前所选题库的所有练习进度，历史统计保留。',queue:'将重置当前范围的题号进度与答题状态，历史统计保留。',wrong:'将清空错题本，历史作答统计保留。',all:'将清空当前浏览器中的全部学习记录。你可以先导出备份。'};
    openModal('确认重置',`<p>${descriptions[kind]}</p><div class="modal-footer">${button('close-modal','取消','btn secondary')}${button('reset-now','确认重置','btn danger',`data-kind="${kind}"`)}</div>`);
  }
  function openSearch() {
    openModal('搜索',`<div class="search">${icon('search')}<input id="global-search" placeholder="题号、知识点或英文缩写" aria-label="搜索内容"></div><div id="search-results" class="search-results"></div>`);
    document.getElementById('global-search').focus();
  }
  function searchAll(query) {
    const target=document.getElementById('search-results');
    const value=query.trim().toLowerCase();if(!target)return;
    if(!value){target.innerHTML='';return;}
    const notes=sections.filter(section=>`${section.title} ${(section.aliases||[]).join(' ')} ${(section.terms||[]).join(' ')}`.toLowerCase().includes(value)).slice(0,6);
    const matches=questions.filter(question=>question.id.toLowerCase()===value||`${question.stem} ${question.options.map(option=>option.text).join(' ')}`.toLowerCase().includes(value)).sort((a,b)=>Number(b.id.toLowerCase()===value)-Number(a.id.toLowerCase()===value)).slice(0,20);
    target.innerHTML=`${notes.map(section=>button('open-section',`<h3>${e(section.title)}</h3><p>知识笔记 · ${topicName(section.chapter)}</p>`,'search-result',`data-id="${section.id}"`)).join('')}${matches.map(question=>button('jump-id',`<h3>${e(question.stem)}</h3><p>${question.id} · ${question.type}题</p>`,'search-result',`data-id="${question.id}"`)).join('')}${notes.length||matches.length?'':'<p class="small muted">未找到相关内容</p>'}`;
  }
  function showReportQuestion(id,report) {
    const result=state.history.find(item=>item.id===report);
    const question=questionById.get(id);if(!question||!result)return;
    const answer=result.answers[id];
    openModal(`${id} · ${question.type}题`,`<h3 class="question-stem">${e(question.stem)}</h3><div class="options">${question.options.map(option=>`<div class="option ${question.answer.includes(option.id)?'correct':answer?.selected?.includes(option.id)?'wrong':''}">${question.type==='判断'?'':`<span class="option-letter">${option.id}</span>`}<span class="option-text">${e(option.text)}</span></div>`).join('')}</div><div class="explanation"><div class="answer-heading"><strong>正确答案 ${answerLabel(question)}</strong></div>${renderExplanationContent(question)}</div><div class="related">${relatedSections(question).map(section=>button('open-section',`${icon('book')}${e(section.title)}`,'',`data-id="${section.id}"`)).join('')}</div>`);
  }
  function exportRecords() {
    const blob=new Blob([JSON.stringify({app:'zhixu-ict',version:1,exportedAt:Date.now(),state},null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob);const anchor=document.createElement('a');
    anchor.href=url;anchor.download=`知序学习备份-${today()}.json`;anchor.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);toast('备份已导出。');
  }
  function validExam(exam) {
    return exam&&Array.isArray(exam.ids)&&exam.ids.length&&exam.ids.every(id=>questionById.has(id))&&Number.isFinite(exam.index)&&exam.index>=0&&exam.index<exam.ids.length&&Number.isFinite(exam.deadline)&&exam.answers&&typeof exam.answers==='object';
  }
  async function importRecords(file) {
    if(!file)return;
    try {
      if(file.size>30*1024*1024)throw new Error('size');
      const payload=JSON.parse(await file.text());const incoming=payload.state;
      if(payload.app!=='zhixu-ict'||payload.version!==1||!Array.isArray(incoming?.attempts)||!Array.isArray(incoming.favorites)||!Array.isArray(incoming.history))throw new Error('format');
      if(incoming.attempts.some(attempt=>!questionById.has(attempt.question)||!Array.isArray(attempt.selected)||!attempt.selected.every(id=>questionById.get(attempt.question).options.some(option=>option.id===id))||typeof attempt.id!=='string'||typeof attempt.correct!=='boolean'||!Number.isFinite(attempt.time)))throw new Error('attempt');
      const candidate=structuredClone(state);
      const attempts=new Map([...candidate.attempts,...incoming.attempts].map(attempt=>[attempt.id,attempt]));
      candidate.attempts=[...attempts.values()].sort((a,b)=>a.time-b.time);
      candidate.favorites=[...new Set([...candidate.favorites,...incoming.favorites.filter(id=>questionById.has(id))])];
      candidate.publicFavorites=[...new Set([...candidate.publicFavorites,...(incoming.publicFavorites||[]).filter(id=>publicIds.has(id))])];
      candidate.pastFavorites=[...new Set([...candidate.pastFavorites,...(incoming.pastFavorites||[]).filter(id=>pastIds.has(id))])];
      if(typeof incoming.notebook==='string'&&incoming.notebook.trim()&&!candidate.notebook.includes(incoming.notebook)){
        candidate.notebook=[candidate.notebook,incoming.notebook].filter(Boolean).join('\n\n');
      }
      for(const [id,note] of Object.entries(incoming.notes||{}))if(questionById.has(id)&&typeof note==='string'&&!candidate.notes[id])candidate.notes[id]=note.slice(0,10000);
      for(const [id,mark] of Object.entries(incoming.marks||{}))if(questionById.has(id.replace(/^(public|past)\|/,''))&&mark&&Number.isFinite(mark.updated)&&(!candidate.marks[id]||candidate.marks[id].updated<mark.updated))candidate.marks[id]=mark;
      for(const [id,card] of Object.entries(incoming.cards||{}))if(conceptById.has(id)&&card&&Number.isFinite(card.updated)&&(!candidate.cards[id]||candidate.cards[id].updated<card.updated))candidate.cards[id]=card;
      for(const [key,queue] of Object.entries(incoming.queues||{})) {
        if(!Array.isArray(queue?.ids)||!queue.ids.every(id=>questionById.has(id))||!Number.isInteger(queue.index)||queue.index<0||!Number.isFinite(queue.updated)||!queue.answers||!queue.selections||!queue.viewed||!queue.guesses)continue;
        if(!candidate.queues[key]||candidate.queues[key].updated<queue.updated)candidate.queues[key]=queue;
      }
      const reports=incoming.history.filter(report=>report&&typeof report.id==='string'&&Array.isArray(report.ids)&&report.ids.every(id=>questionById.has(id))&&report.answers&&Object.values(report.answers).every(answer=>answer&&Array.isArray(answer.selected))&&Number.isFinite(report.time)&&Number.isFinite(report.score));
      candidate.history=[...new Map([...candidate.history,...reports].map(report=>[report.id,report])).values()].sort((a,b)=>b.time-a.time).slice(0,100);
      if(!candidate.activeExam&&validExam(incoming.activeExam))candidate.activeExam=incoming.activeExam;
      if(!candidate.activeExam&&incoming.session?.exam){
        const exam={...incoming.session,answers:incoming.session.selections||{},guesses:incoming.session.guesses||{},flags:incoming.session.flags||{}};
        if(validExam(exam))candidate.activeExam=exam;
      }
      updateCorrectedAnswers(candidate,true);
      const original=state;state=candidate;
      if(save()){render();toast('备份已合并。');}else state=original;
    } catch {toast('导入失败，请选择知序导出的备份文件。');}
  }
  function showMobile() {
    openModal('在手机打开',`<p>用手机浏览器打开下面的链接。</p>${SITE_URL==='https://ict-study-pocket-35880.decentblade3.chatgpt.site/'?'<img class="qr" src="mobile-qr.svg" alt="手机打开本应用的二维码">':''}<a class="mobile-url" href="${SITE_URL}" target="_blank" rel="noopener noreferrer">${SITE_URL}</a><p class="mt small">可通过浏览器菜单或分享菜单添加到主屏幕。记录保存在当前浏览器。</p><div class="modal-footer">${button('copy-url','复制链接','btn secondary')}${button('install','添加到桌面','btn')}</div>`);
  }
  document.addEventListener('click',event=>{
    const target=event.target.closest('[data-action]');if(!target||target.disabled)return;
    if(Date.now()<swipeClickUntil){event.preventDefault();return;}
    const action=target.dataset.action;const id=target.dataset.id;const value=target.dataset.value;
    switch(action) {
      case 'close-modal':closeModal();break;
      case 'notebook-toggle':state.ui.notebookOpen=!state.ui.notebookOpen;save();render();break;
      case 'notebook-close':state.ui.notebookOpen=false;save();render();break;
      case 'notebook-all':navigate('notebook');break;
      case 'notebook-back':navigate(practiceRoute(state.study.bank));break;
      case 'ask-ai':clearTimeout(nextQuestionTimer);window.ICT_TUTOR?.open(questionById.get(id),openModal);break;
      case 'search':openSearch();break;
      case 'public-view':state.ui.publicView=value;save();render();break;
      case 'past-year':state.ui.pastYear=value;save();render();break;
      case 'public-start':{
        const bank=target.dataset.bank||'public';
        const selected=bank==='past'?(DATA.pastCollections||[]).find(item=>item.id===target.dataset.year):null;
        state.study={topic:target.dataset.topic||'all',type:'all',order:target.dataset.order||'sequential',mode:target.dataset.mode||'practice',section:selected?`past-${selected.id}`:null,customIds:selected?.ids||null,label:selected?.label||null,bank};
        ensureQueue();save();navigate(practiceRoute(bank));break;
      }
      case 'public-home':navigate('public');break;
      case 'record-bank':state.ui.recordBank=value;save();render();break;
      case 'study-filters-toggle':state.ui.studyFiltersOpen=!state.ui.studyFiltersOpen;save();render();break;
      case 'study-mode':state.study.mode=value;save();render();break;
      case 'answer-map':openMap();break;
      case 'map-jump':moveQuestion(Number(target.dataset.index));break;
      case 'map-go':{
        const index=Number(document.getElementById('map-jump').value)-1;
        if(!Number.isInteger(index)||index<0||index>=activeQueue().ids.length)toast('请输入范围内的题号。');else moveQuestion(index);
        break;
      }
      case 'previous':moveQuestion(activeQueue().index-1);break;
      case 'next':moveQuestion(activeQueue().index+1);break;
      case 'select-option':{
        const queue=activeQueue();const question=activeQuestion();const exam=route==='exam'&&!!state.activeExam;
        const answers=exam?queue.answers:queue.selections;
        if(!exam&&(state.study.mode==='memory'||queue.answers[question.id]))return;
        const selected=answers[question.id]||[];
        answers[question.id]=question.type==='多选'?(selected.includes(id)?selected.filter(option=>option!==id):[...selected,id]):[id];
        if(!exam&&question.type!=='多选'){submitAnswer();break;}
        queue.updated=Date.now();save();render();break;
      }
      case 'submit-answer':submitAnswer();break;
      case 'favorite':{
        const question=activeQuestion();
        const bank=effectiveBank(question.id);
        const key=bank==='original'?'favorites':`${bank}Favorites`;
        state[key]=state[key].includes(question.id)?state[key].filter(qid=>qid!==question.id):[...state[key],question.id];
        save();render();break;
      }
      case 'note':{
        const question=activeQuestion();
        openModal(`${question.id} 的笔记`,`<textarea id="note-input" class="note-input" maxlength="10000" placeholder="写下自己的理解">${e(state.notes[question.id]||'')}</textarea><div class="modal-footer">${button('save-note','保存','btn',`data-id="${question.id}"`)}</div>`);break;
      }
      case 'save-note':state.notes[id]=document.getElementById('note-input').value.trim();if(!state.notes[id])delete state.notes[id];if(save()){closeModal();toast('笔记已保存。');}break;
      case 'flag':{const queue=state.activeExam;const question=activeQuestion();queue.flags[question.id]=!queue.flags[question.id];save();render();break;}
      case 'study-settings':openStudySettings();break;
      case 'record-settings':openRecordSettings();break;
      case 'redo-question':{
        const queue=ensureQueue();const question=currentStudyQuestion();
        delete queue.answers[question.id];delete queue.selections[question.id];delete queue.guesses[question.id];
        state.study.mode='practice';queue.updated=Date.now();save();closeModal();render();break;
      }
      case 'reshuffle':state.study.order='random';delete state.queues[queueKey()];ensureQueue();save();closeModal();render();break;
      case 'confirm-reset':confirmReset(target.dataset.kind);break;
      case 'reset-now':{
        const kind=target.dataset.kind;
        if(kind==='all')state=defaults();
        if(kind==='queue'){delete state.queues[queueKey()];ensureQueue();}
        if(kind==='bank-progress'){for(const key of Object.keys(state.queues))if(queueBank(key)===state.ui.recordBank)delete state.queues[key];}
        if(kind==='wrong'){
          Object.entries(state.marks).forEach(([key,mark])=>{if(marksBank(key)===state.ui.recordBank){mark.pending=false;mark.updated=Date.now();}});
          for(const key of Object.keys(state.queues))if(key.includes('|wrong')&&queueBank(key)===state.ui.recordBank)delete state.queues[key];
        }
        if(save()){closeModal();render();toast('已重置。');}break;
      }
      case 'all-questions':startScope();break;
      case 'knowledge-view':state.ui.knowledgeView=value;save();render();break;
      case 'knowledge-sources':openModal('范围与来源',`<p>${e(DATA.scopeNote)}</p><div class="sources">${(DATA.sources||[]).filter(source=>/huawei\.com/.test(source.url)).map(source=>`<a href="${e(source.url)}" target="_blank" rel="noopener noreferrer">${e(source.title)}</a>`).join('')}</div>`);break;
      case 'chapter':state.ui.chapter=id;state.ui.openSection=null;save();render();break;
      case 'topic-study':startScope(id,target.dataset.mode);break;
      case 'open-section':openSection(id);break;
      case 'view-chapter':{
        const section=sectionById.get(id);state.ui={...state.ui,chapter:section.chapter,knowledgeView:'notes',openSection:id};save();navigate('knowledge');
        requestAnimationFrame(()=>document.getElementById(`note-${id}`)?.scrollIntoView({block:'start'}));break;
      }
      case 'section-practice':{const section=sectionById.get(id);startScope(section.chapter,'practice',id);break;}
      case 'section-memory':{const section=sectionById.get(id);startScope(section.chapter,'memory',id);break;}
      case 'concept':openConcept(id);break;
      case 'concept-practice':{
        const concept=conceptById.get(id);state.study={topic:'all',type:'all',order:'sequential',mode:'practice',section:`concept-${id}`,customIds:concept.questions,label:concept.title,bank:'all'};
        ensureQueue(true);save();navigate(practiceRoute(state.study.bank));break;
      }
      case 'flash':startFlash();break;
      case 'flash-reveal':flashRevealed=true;renderFlash();break;
      case 'flash-rate':state.cards[flashIds[flashIndex]]={level:Number(target.dataset.level),updated:Date.now()};save();flashIndex++;flashRevealed=false;renderFlash();break;
      case 'exam-type':examSettings.types=examSettings.types.includes(value)?examSettings.types.filter(type=>type!==value):[...examSettings.types,value];render();break;
      case 'start-exam':beginExam();break;
      case 'confirm-submit':{
        const exam=state.activeExam;const missing=exam.ids.filter(qid=>!exam.answers[qid]?.length).length;
        openModal('确认交卷',`<p>${missing?`还有 ${missing} 道题未作答。`:'全部题目已作答。'}</p><div class="modal-footer">${button('close-modal','继续检查','btn secondary')}${button('submit-exam','交卷','btn')}</div>`);break;
      }
      case 'submit-exam':finishExam();break;
      case 'report':reportId=id;navigate('report');break;
      case 'exam-route':navigate('exam');break;
      case 'report-review':case 'report-redo':{
        const report=state.history.find(item=>item.id===id);
        const ids=action==='report-review'?report.ids.filter(qid=>!report.answers[qid]?.correct):report.ids;
        state.study={topic:'all',type:'all',order:'sequential',mode:'practice',section:`report-${id}`,customIds:ids,label:action==='report-review'?'本次错题':'本次试卷',bank:report.bank||'original'};
        ensureQueue(true);save();navigate(practiceRoute(state.study.bank));break;
      }
      case 'report-question':showReportQuestion(id,target.dataset.report);break;
      case 'collection':collection=value;collectionLimit=50;render();break;
      case 'more-collection':collectionLimit+=50;render();break;
      case 'collection-study':{
        state.study={topic:'all',type:'all',order:collection==='favorites'?'favorites':'wrong',mode:'practice',section:null,bank:state.ui.recordBank};
        if(collection==='notes'){
          state.study.order='sequential';state.study.section='notes';state.study.customIds=questions.filter(question=>state.notes[question.id]).map(question=>question.id);state.study.label='笔记题目';ensureQueue(true);
        }else ensureQueue(true);
        save();navigate(practiceRoute(state.study.bank));break;
      }
      case 'jump-id':jumpToId(id);break;
      case 'export':exportRecords();break;
      case 'import':document.getElementById('import-file').click();break;
      case 'mobile':showMobile();break;
      case 'copy-url':navigator.clipboard?.writeText(SITE_URL).then(()=>toast('链接已复制。')).catch(()=>toast('请长按链接复制。'));break;
      case 'install':if(installEvent){installEvent.prompt();installEvent=null;}else toast('请在浏览器菜单或分享菜单中选择“添加到主屏幕”。');break;
    }
  });
  document.addEventListener('pointerdown',event=>{
    if(event.pointerType==='mouse')return;
    swipeClickUntil=0;
    questionSwipe=null;
    if(!event.isPrimary||overlayRoot.firstChild||!(route==='study'||route==='exam'&&state.activeExam))return;
    const question=event.target.closest('.question');
    if(!question||!main.contains(question)||event.target.closest('a,input,select,textarea,summary,[data-action]:not([data-action="select-option"])'))return;
    clearTimeout(nextQuestionTimer);
    const queue=activeQueue();
    questionSwipe={pointer:event.pointerId,x:event.clientX,y:event.clientY,time:Date.now(),queue,index:queue.index};
  });
  document.addEventListener('pointerup',event=>{
    const swipe=questionSwipe;
    questionSwipe=null;
    if(!swipe||swipe.pointer!==event.pointerId||overlayRoot.firstChild||!(route==='study'||route==='exam'&&state.activeExam))return;
    const horizontal=event.clientX-swipe.x;
    const vertical=event.clientY-swipe.y;
    if(Date.now()-swipe.time>1200||Math.abs(horizontal)<65||Math.abs(horizontal)<Math.abs(vertical)*1.6)return;
    if(activeQueue()!==swipe.queue||swipe.queue.index!==swipe.index)return;
    swipeClickUntil=Date.now()+400;
    event.preventDefault();
    moveQuestion(swipe.index+(horizontal<0?1:-1));
  });
  document.addEventListener('pointercancel',()=>{questionSwipe=null;});
  document.addEventListener('input',event=>{
    if(event.target.id==='global-search')searchAll(event.target.value);
    if(event.target.id==='learning-notebook'){
      state.notebook=event.target.value;
      const saved=save();
      const status=document.getElementById('notebook-status');
      if(status)status.textContent=saved?'已保存':'保存失败，请导出备份';
    }
  });
  document.addEventListener('change',event=>{
    const target=event.target;
    switch(target.id){
      case 'study-topic':if(target.value!=='section'){state.study.topic=target.value;state.study.section=null;state.study.customIds=null;state.study.label=null;ensureQueue(true);save();render();}break;
      case 'study-type':state.study.type=target.value;ensureQueue(true);save();render();break;
      case 'study-order':state.study.order=target.value;ensureQueue(true);save();render();break;
      case 'guess-answer':{const queue=activeQueue();queue.guesses[activeQuestion().id]=target.checked;save();break;}
      case 'map-page':mapPage=Number(target.value);renderMap();break;
      case 'exam-bank':examSettings.bank=target.value;break;
      case 'exam-topic':examSettings.topic=target.value;break;
      case 'exam-count':examSettings.count=Number(target.value);break;
      case 'exam-minutes':examSettings.minutes=Number(target.value);break;
      case 'font-size':state.settings.font=target.value;save();render();break;
      case 'import-file':importRecords(target.files[0]);break;
    }
  });
  document.addEventListener('toggle',event=>{
    const target=event.target;
    if(target.matches?.('.note-section')&&target.open){state.ui.openSection=target.id.replace('note-','');save();}
  },true);
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&overlayRoot.firstChild)closeModal();
    if(event.key==='Enter'&&event.target.id==='map-jump')document.querySelector('[data-action="map-go"]')?.click();
    if(event.key==='Tab'&&overlayRoot.firstChild){
      const elements=[...overlayRoot.querySelectorAll('button:not(:disabled),input,textarea,select,a,summary')];
      if(!elements.length)return;
      const first=elements[0],last=elements[elements.length-1];
      if(event.shiftKey&&(document.activeElement===first||document.activeElement.classList.contains('modal'))){event.preventDefault();last.focus();}
      if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
    }
  });
  window.addEventListener('hashchange',()=>{route=readRoute();closeModal();render();window.scrollTo(0,0);});
  window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();installEvent=event;});
  setInterval(()=>{
    const exam=state.activeExam;if(!exam)return;
    if(exam.deadline<=Date.now()){finishExam();toast('时间到，已自动交卷。');return;}
    const timer=document.getElementById('exam-timer');if(timer)timer.textContent=formatTime(exam.deadline-Date.now());
  },1000);
  route=readRoute();render();
  if('serviceWorker' in navigator&&location.protocol!=='file:')navigator.serviceWorker.register('./sw.js').catch(()=>{});
})();
