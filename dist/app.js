const $=id=>document.getElementById(id);

let toastTimer;
function toast(message){
  const el=$('toast');
  el.textContent=message;
  el.style.display='block';
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>el.style.display='none',4200);
}

/* ---------- Navegação ---------- */
const areas={reference:$('reference'),builder:$('builder'),simulation:$('simulation')};
function showArea(name){
  Object.entries(areas).forEach(([key,el])=>el.hidden=key!==name);
  $('referenceTab').classList.toggle('active',name==='reference');
  $('builderTab').classList.toggle('active',name==='builder');
  $('simTab').classList.toggle('active',name==='simulation');
  $('referenceTab').setAttribute('aria-selected',name==='reference');
  $('builderTab').setAttribute('aria-selected',name==='builder');
  $('simTab').setAttribute('aria-selected',name==='simulation');
  if(name==='builder'){renderGraph();requestAnimationFrame(renderWires);}
  if(name==='simulation'){prepareSimulation();}
}
$('referenceTab').onclick=()=>showArea('reference');
$('builderTab').onclick=()=>showArea('builder');
$('simTab').onclick=()=>showArea('simulation');
$('goBuilder').onclick=()=>showArea('builder');
$('showReference').onclick=()=>showArea('reference');
$('backToBuilder').onclick=()=>showArea('builder');

/* ---------- PDF de referência ---------- */
let pdfUrl='sy750h.pdf',pdfBlobUrl=null,refScale=1;
async function renderReference(){
  const canvas=$('refCanvas');
  try{
    if(!window.pdfjsLib) throw new Error('PDF.js indisponível');
    window.pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    const pdf=await window.pdfjsLib.getDocument(pdfUrl).promise;
    const page=await pdf.getPage(1);
    const base=page.getViewport({scale:1});
    const targetWidth=2200;
    const viewport=page.getViewport({scale:targetWidth/base.width});
    canvas.width=Math.round(viewport.width);
    canvas.height=Math.round(viewport.height);
    await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;
    applyRefScale();
  }catch(err){
    console.error(err);
    toast('Não foi possível renderizar o PDF de referência.');
  }
}
function applyRefScale(){
  $('refDrawing').style.width=(refScale*100)+'%';
  $('refZoomLabel').textContent=Math.round(refScale*100)+'%';
}
$('refZoomIn').onclick=()=>{refScale=Math.min(4,refScale+.25);applyRefScale();};
$('refZoomOut').onclick=()=>{refScale=Math.max(1,refScale-.25);applyRefScale();};
$('refFit').onclick=()=>{refScale=1;applyRefScale();$('refViewport').scrollTo(0,0);};
$('refFullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.querySelector('#reference .viewer').requestFullscreen();}catch{toast('Tela cheia não disponível neste navegador.');}};
$('openPdf').onclick=()=>$('pdfFile').click();
$('pdfFile').onchange=async e=>{
  const file=e.target.files[0];if(!file)return;
  if(file.size>45*1024*1024){toast('Use um PDF de até 45 MB.');return;}
  const sig=await file.slice(0,5).text();
  if(sig!=='%PDF-'){toast('O arquivo selecionado não é um PDF válido.');return;}
  if(pdfBlobUrl)URL.revokeObjectURL(pdfBlobUrl);
  pdfBlobUrl=URL.createObjectURL(file);pdfUrl=pdfBlobUrl;
  $('filename').textContent=file.name;
  $('docmeta').textContent='PDF local · usado como referência';
  $('referenceTitle').textContent=file.name;
  await renderReference();
  showArea('reference');
};

/* ---------- Modelo gráfico ---------- */
const GRAPH_KEY='hidrolab.graphs.v2';
const NODE_TYPES={
  tank:{label:'Reservatório',ports:[['T1','out'],['T2','out']],w:150,h:82},
  pump:{label:'Bomba',ports:[['S','in'],['P','out']],w:150,h:92},
  valve43:{label:'Válvula 4/3',ports:[['P','in'],['T','out'],['A','out'],['B','out']],w:184,h:112},
  cylinder:{label:'Cilindro D.A.',ports:[['A','in'],['B','in']],w:184,h:92},
  motor:{label:'Motor hidráulico',ports:[['A','in'],['B','out']],w:154,h:92},
  relief:{label:'Válvula de alívio',ports:[['P','in'],['T','out']],w:160,h:92},
  pilot:{label:'Comando piloto',ports:[['P','in'],['X','out']],w:160,h:92}
};
const edgeColors={pressure:'#ef4444',work:'#ef4444',return:'#0ea5e9',suction:'#0f766e',pilot:'#d946ef',drain:'#f59e0b'};

let graph={name:'Circuito em desenvolvimento',nodes:[],edges:[]};
let selectedNodeId=null,selectedPort=null,dragState=null;
let nodeSeq=1,edgeSeq=1;

function uid(prefix){return prefix+'_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,6);}
function nodeById(id){return graph.nodes.find(n=>n.id===id);}
function edgeById(id){return graph.edges.find(e=>e.id===id);}
function portKey(nodeId,port){return nodeId+':'+port;}

function addNode(type,x,y,label){
  const spec=NODE_TYPES[type];if(!spec)return;
  const editor=$('circuitEditor');
  const nx=x??Math.max(30,80+(graph.nodes.length%3)*230);
  const ny=y??Math.max(30,70+Math.floor(graph.nodes.length/3)*170);
  const node={id:uid('n'),type,label:label||spec.label+' '+nodeSeq++,x:nx,y:ny,w:spec.w,h:spec.h};
  graph.nodes.push(node);
  selectedNodeId=node.id;
  renderGraph();
  return node;
}
document.querySelectorAll('[data-add]').forEach(btn=>btn.onclick=()=>addNode(btn.dataset.add));

function deleteNode(id){
  graph.nodes=graph.nodes.filter(n=>n.id!==id);
  graph.edges=graph.edges.filter(e=>e.from.node!==id&&e.to.node!==id);
  if(selectedNodeId===id)selectedNodeId=null;
  if(selectedPort?.node===id)selectedPort=null;
  renderGraph();
}
function deleteEdge(id){graph.edges=graph.edges.filter(e=>e.id!==id);renderGraph();}

function nodeSymbol(type){
  if(type==='tank')return '<div class="tank-shape"></div>';
  if(type==='pump')return '<div class="pump-shape"><span>▲</span></div>';
  if(type==='valve43')return '<div class="valve-shape"><span>↗</span><span>■</span><span>↘</span></div>';
  if(type==='cylinder')return '<div class="cyl-shape"><i></i><b></b></div>';
  if(type==='motor')return '<div class="motor-shape">M</div>';
  if(type==='relief')return '<div class="relief-shape">↗</div>';
  return '<div class="pilot-shape">◇</div>';
}

function renderGraph(){
  const layer=$('nodeLayer');
  layer.innerHTML='';
  graph.nodes.forEach(node=>{
    const spec=NODE_TYPES[node.type];
    const el=document.createElement('div');
    el.className='hyd-node'+(node.id===selectedNodeId?' selected':'');
    el.dataset.nodeId=node.id;
    el.style.left=node.x+'px';el.style.top=node.y+'px';el.style.width=node.w+'px';el.style.height=node.h+'px';
    el.innerHTML='<div class="node-title">'+node.label+'</div><div class="node-symbol">'+nodeSymbol(node.type)+'</div>';
    spec.ports.forEach(([p,dir],i)=>{
      const port=document.createElement('button');
      port.type='button';port.className='port '+dir;
      port.dataset.node=node.id;port.dataset.port=p;
      port.title=node.label+' - porta '+p;
      const side=portSide(node.type,p,i);
      port.classList.add(side);
      const pos=portPositionStyle(node.type,p,i,spec.ports.length,side);
      Object.assign(port.style,pos);
      port.innerHTML='<span>'+p+'</span>';
      if(selectedPort&&selectedPort.node===node.id&&selectedPort.port===p)port.classList.add('pending');
      port.onclick=e=>{e.stopPropagation();handlePortClick(node.id,p);};
      el.append(port);
    });
    el.addEventListener('pointerdown',startDrag);
    el.onclick=e=>{if(e.target.closest('.port'))return;selectNode(node.id);};
    layer.append(el);
  });
  $('emptyEditor').hidden=graph.nodes.length>0;
  $('graphStats').textContent=graph.nodes.length+' componentes · '+graph.edges.length+' conexões';
  $('edgeCount').textContent=graph.edges.length;
  renderInspector();
  renderEdgeList();
  requestAnimationFrame(renderWires);
}

function portSide(type,p,i){
  if(type==='pump')return p==='S'?'left':'right';
  if(type==='tank')return 'top';
  if(type==='valve43')return (p==='P'||p==='T')?'bottom':'top';
  if(type==='cylinder')return 'bottom';
  if(type==='motor')return p==='A'?'left':'right';
  if(type==='relief')return p==='P'?'left':'right';
  if(type==='pilot')return p==='P'?'left':'right';
  return i%2?'right':'left';
}
function portPositionStyle(type,p,i,total,side){
  if(side==='left'||side==='right')return{top:((i+1)/(total+1)*100)+'%'};
  if(type==='valve43'){
    if(p==='A')return{left:'28%'};
    if(p==='B')return{left:'72%'};
    if(p==='P')return{left:'28%'};
    if(p==='T')return{left:'72%'};
  }
  return{left:((i+1)/(total+1)*100)+'%'};
}

function selectNode(id){
  selectedNodeId=id;renderGraph();
}
function renderInspector(){
  const n=nodeById(selectedNodeId);
  $('selectedTitle').textContent=n?n.label:'Nenhum componente selecionado';
  $('selectedMeta').textContent=n?NODE_TYPES[n.type].label+' · '+NODE_TYPES[n.type].ports.map(p=>p[0]).join(' / '):'Clique em um componente para editar.';
  $('nodeLabel').disabled=!n;$('applyNodeLabel').disabled=!n;$('deleteNode').disabled=!n;
  $('nodeLabel').value=n?n.label:'';
}
$('applyNodeLabel').onclick=()=>{const n=nodeById(selectedNodeId);if(!n)return;n.label=$('nodeLabel').value.trim()||NODE_TYPES[n.type].label;renderGraph();};
$('deleteNode').onclick=()=>{if(selectedNodeId)deleteNode(selectedNodeId);};

function handlePortClick(nodeId,port){
  if(!selectedPort){
    selectedPort={node:nodeId,port};
    $('connectStatus').textContent='Origem selecionada: '+nodeById(nodeId).label+' / '+port+' → escolha a porta de destino.';
    renderGraph();return;
  }
  if(selectedPort.node===nodeId&&selectedPort.port===port){
    selectedPort=null;$('connectStatus').textContent='Conexão cancelada.';renderGraph();return;
  }
  const duplicate=graph.edges.some(e=>(e.from.node===selectedPort.node&&e.from.port===selectedPort.port&&e.to.node===nodeId&&e.to.port===port)||(e.to.node===selectedPort.node&&e.to.port===selectedPort.port&&e.from.node===nodeId&&e.from.port===port));
  if(duplicate){toast('Estas portas já estão conectadas.');selectedPort=null;renderGraph();return;}
  graph.edges.push({id:uid('e'),type:$('edgeType').value,from:{...selectedPort},to:{node:nodeId,port}});
  selectedPort=null;
  $('connectStatus').textContent='Conexão criada. Selecione outra porta para continuar.';
  renderGraph();
}

function startDrag(e){
  if(e.button!==0||e.target.closest('.port'))return;
  const el=e.currentTarget,node=nodeById(el.dataset.nodeId);if(!node)return;
  selectedNodeId=node.id;
  dragState={node,startX:e.clientX,startY:e.clientY,x:node.x,y:node.y};
  el.setPointerCapture(e.pointerId);
  el.addEventListener('pointermove',dragMove);
  el.addEventListener('pointerup',dragEnd,{once:true});
  renderInspector();
}
function dragMove(e){
  if(!dragState)return;
  const editor=$('circuitEditor');
  dragState.node.x=Math.max(8,Math.min(editor.clientWidth-dragState.node.w-8,dragState.x+(e.clientX-dragState.startX)));
  dragState.node.y=Math.max(8,Math.min(editor.clientHeight-dragState.node.h-8,dragState.y+(e.clientY-dragState.startY)));
  const el=document.querySelector('[data-node-id="'+dragState.node.id+'"]');
  if(el){el.style.left=dragState.node.x+'px';el.style.top=dragState.node.y+'px';}
  renderWires();
}
function dragEnd(e){
  e.currentTarget.removeEventListener('pointermove',dragMove);
  dragState=null;renderGraph();
}

function portCenter(node,port){
  const spec=NODE_TYPES[node.type],entry=spec.ports.findIndex(p=>p[0]===port),side=portSide(node.type,port,entry);
  const style=portPositionStyle(node.type,port,entry,spec.ports.length,side);
  let x=node.x,y=node.y;
  if(side==='left'){x=node.x;y=node.y+parseFloat(style.top)/100*node.h;}
  if(side==='right'){x=node.x+node.w;y=node.y+parseFloat(style.top)/100*node.h;}
  if(side==='top'){x=node.x+parseFloat(style.left)/100*node.w;y=node.y;}
  if(side==='bottom'){x=node.x+parseFloat(style.left)/100*node.w;y=node.y+node.h;}
  return{x,y,side};
}
function orthogonalPath(a,b){
  const dx=Math.abs(a.x-b.x),dy=Math.abs(a.y-b.y);
  if(dx>dy){
    const mx=(a.x+b.x)/2;
    return 'M '+a.x+' '+a.y+' L '+mx+' '+a.y+' L '+mx+' '+b.y+' L '+b.x+' '+b.y;
  }
  const my=(a.y+b.y)/2;
  return 'M '+a.x+' '+a.y+' L '+a.x+' '+my+' L '+b.x+' '+my+' L '+b.x+' '+b.y;
}
function renderWires(){
  const svg=$('wireLayer');if(!svg)return;
  svg.setAttribute('viewBox','0 0 '+$('circuitEditor').clientWidth+' '+$('circuitEditor').clientHeight);
  svg.innerHTML='';
  graph.edges.forEach(edge=>{
    const aNode=nodeById(edge.from.node),bNode=nodeById(edge.to.node);if(!aNode||!bNode)return;
    const a=portCenter(aNode,edge.from.port),b=portCenter(bNode,edge.to.port);
    const path=document.createElementNS('http://www.w3.org/2000/svg','path');
    path.setAttribute('d',orthogonalPath(a,b));path.setAttribute('class','wire '+edge.type);path.dataset.edgeId=edge.id;
    svg.append(path);
  });
}
window.addEventListener('resize',()=>{renderWires();renderSimGraph();});

function renderEdgeList(){
  const box=$('edgeList');box.innerHTML='';
  graph.edges.forEach(edge=>{
    const a=nodeById(edge.from.node),b=nodeById(edge.to.node);
    const row=document.createElement('div');row.className='edge-row';
    row.innerHTML='<i style="background:'+(edgeColors[edge.type]||'#64748b')+'"></i><div><strong>'+(a?.label||'?')+' '+edge.from.port+' → '+(b?.label||'?')+' '+edge.to.port+'</strong><small>'+edge.type+'</small></div><button data-edge-delete="'+edge.id+'">×</button>';
    box.append(row);
  });
  box.querySelectorAll('[data-edge-delete]').forEach(b=>b.onclick=()=>deleteEdge(b.dataset.edgeDelete));
}

$('builderClear').onclick=()=>{graph={name:'Circuito em desenvolvimento',nodes:[],edges:[]};selectedNodeId=null;selectedPort=null;nodeSeq=1;renderGraph();};
$('builderFit').onclick=()=>{if(!graph.nodes.length)return;const minX=Math.min(...graph.nodes.map(n=>n.x)),minY=Math.min(...graph.nodes.map(n=>n.y));graph.nodes.forEach(n=>{n.x=n.x-minX+40;n.y=n.y-minY+45;});renderGraph();};

function demoGraph(){
  nodeSeq=1;
  const nodes=[
    {id:'demo_tank',type:'tank',label:'Reservatório',x:70,y:430,w:150,h:82},
    {id:'demo_pump',type:'pump',label:'Bomba principal',x:80,y:255,w:150,h:92},
    {id:'demo_valve',type:'valve43',label:'Válvula direcional 4/3',x:390,y:235,w:184,h:112},
    {id:'demo_cyl',type:'cylinder',label:'Cilindro de dupla ação',x:720,y:120,w:184,h:92}
  ];
  const edges=[
    {id:'de1',type:'suction',from:{node:'demo_tank',port:'T1'},to:{node:'demo_pump',port:'S'}},
    {id:'de2',type:'pressure',from:{node:'demo_pump',port:'P'},to:{node:'demo_valve',port:'P'}},
    {id:'de3',type:'work',from:{node:'demo_valve',port:'A'},to:{node:'demo_cyl',port:'A'}},
    {id:'de4',type:'work',from:{node:'demo_valve',port:'B'},to:{node:'demo_cyl',port:'B'}},
    {id:'de5',type:'return',from:{node:'demo_valve',port:'T'},to:{node:'demo_tank',port:'T2'}}
  ];
  graph={name:'Demonstração didática - circuito genérico',nodes,edges};
  selectedNodeId='demo_valve';selectedPort=null;renderGraph();
  $('graphName').value=graph.name;
}
$('loadDemoGraph').onclick=()=>{demoGraph();toast('Circuito demonstrativo carregado. Ele é genérico e não representa a SY750H.');};

/* ---------- Persistência ---------- */
function savedGraphs(){try{return JSON.parse(localStorage.getItem(GRAPH_KEY)||'{}')}catch{return{}}}
function refreshSavedGraphs(){
  const data=savedGraphs(),sel=$('savedGraphs'),current=sel.value;
  sel.innerHTML='<option value="">Selecione...</option>';
  Object.keys(data).sort().forEach(name=>{const o=document.createElement('option');o.value=name;o.textContent=name;sel.append(o);});
  if(data[current])sel.value=current;
}
$('graphName').oninput=e=>{graph.name=e.target.value;};
$('saveGraph').onclick=()=>{
  const name=$('graphName').value.trim();if(!name){toast('Informe um nome para o circuito.');return;}
  if(!graph.nodes.length){toast('Adicione componentes antes de salvar.');return;}
  graph.name=name;const data=savedGraphs();data[name]=JSON.parse(JSON.stringify(graph));localStorage.setItem(GRAPH_KEY,JSON.stringify(data));refreshSavedGraphs();$('savedGraphs').value=name;toast('Circuito salvo neste navegador.');
};
$('loadGraph').onclick=()=>{const name=$('savedGraphs').value,data=savedGraphs();if(!name||!data[name])return;graph=JSON.parse(JSON.stringify(data[name]));$('graphName').value=graph.name||name;selectedNodeId=null;selectedPort=null;renderGraph();toast('Circuito carregado.');};
$('deleteGraph').onclick=()=>{const name=$('savedGraphs').value;if(!name)return;const data=savedGraphs();delete data[name];localStorage.setItem(GRAPH_KEY,JSON.stringify(data));refreshSavedGraphs();toast('Circuito excluído.');};

/* ---------- Simulação lógica ---------- */
let simPumpOn=false,valveState='neutral';
const internalLinks={
  extend:[['P','A','pressure'],['B','T','return']],
  retract:[['P','B','pressure'],['A','T','return']],
  neutral:[]
};
function prepareSimulation(){
  $('simGraphName').textContent=graph.name||'Circuito em desenvolvimento';
  simPumpOn=false;valveState='neutral';
  $('simPump').classList.remove('on');$('simPump').setAttribute('aria-pressed','false');$('pumpState').textContent='Desligada';
  document.querySelectorAll('[data-valve-state]').forEach(b=>b.classList.toggle('chosen',b.dataset.valveState==='neutral'));
  renderSimGraph();
}
function simPortCenter(node,port){
  const editor=$('simEditor');
  const sx=editor.clientWidth/$('circuitEditor').clientWidth;
  const sy=editor.clientHeight/$('circuitEditor').clientHeight;
  const p=portCenter(node,port);
  return{x:p.x*sx,y:p.y*sy};
}
function renderSimGraph(){
  const layer=$('simNodeLayer'),svg=$('simWireLayer');if(!layer||!svg)return;
  layer.innerHTML='';svg.innerHTML='';
  svg.setAttribute('viewBox','0 0 '+$('simEditor').clientWidth+' '+$('simEditor').clientHeight);
  const sx=$('simEditor').clientWidth/$('circuitEditor').clientWidth;
  const sy=$('simEditor').clientHeight/$('circuitEditor').clientHeight;
  graph.nodes.forEach(n=>{
    const el=document.createElement('div');el.className='hyd-node sim-node';el.style.left=(n.x*sx)+'px';el.style.top=(n.y*sy)+'px';el.style.width=(n.w*sx)+'px';el.style.height=(n.h*sy)+'px';
    el.innerHTML='<div class="node-title">'+n.label+'</div><div class="node-symbol">'+nodeSymbol(n.type)+'</div>';
    layer.append(el);
  });
  const active=computeActiveEdges();
  graph.edges.forEach(edge=>{
    const a=nodeById(edge.from.node),b=nodeById(edge.to.node);if(!a||!b)return;
    const pa=simPortCenter(a,edge.from.port),pb=simPortCenter(b,edge.to.port);
    const path=document.createElementNS('http://www.w3.org/2000/svg','path');
    path.setAttribute('d',orthogonalPath(pa,pb));
    const state=active.get(edge.id);
    path.setAttribute('class','wire sim-wire '+edge.type+(state?' active '+state:''));
    svg.append(path);
  });
  const pressure=[...active.values()].filter(v=>v==='pressure').length;
  const ret=[...active.values()].filter(v=>v==='return').length;
  $('pressureReadout').textContent=pressure;$('returnReadout').textContent=ret;
}
function computeActiveEdges(){
  const result=new Map();
  if(!simPumpOn)return result;
  const valve=graph.nodes.find(n=>n.type==='valve43');
  const pump=graph.nodes.find(n=>n.type==='pump');
  if(!pump)return result;

  const adjacency=new Map();
  function connect(a,b,kind,edgeId){
    if(!adjacency.has(a))adjacency.set(a,[]);
    if(!adjacency.has(b))adjacency.set(b,[]);
    adjacency.get(a).push({to:b,kind,edgeId});
    adjacency.get(b).push({to:a,kind,edgeId});
  }
  graph.edges.forEach(e=>connect(portKey(e.from.node,e.from.port),portKey(e.to.node,e.to.port),e.type,e.id));
  if(valve){
    internalLinks[valveState].forEach(([a,b,kind])=>connect(portKey(valve.id,a),portKey(valve.id,b),kind,'internal:'+a+b));
  }

  const source=portKey(pump.id,'P');
  const visited=new Set([source]);const q=[source];
  while(q.length){
    const cur=q.shift();
    for(const link of adjacency.get(cur)||[]){
      if(link.edgeId&&!link.edgeId.startsWith('internal:')){
        const kind=(link.kind==='return'||link.kind==='drain')?'return':'pressure';
        if(!result.has(link.edgeId))result.set(link.edgeId,kind);
      }
      if(!visited.has(link.to)){visited.add(link.to);q.push(link.to);}
    }
  }

  const tank=graph.nodes.find(n=>n.type==='tank');
  if(tank&&valve){
    internalLinks[valveState].filter(x=>x[2]==='return').forEach(([a,b])=>{
      const start=portKey(valve.id,b),seen=new Set([start]),qq=[start];
      while(qq.length){
        const cur=qq.shift();
        for(const link of adjacency.get(cur)||[]){
          if(link.edgeId&&!link.edgeId.startsWith('internal:'))result.set(link.edgeId,'return');
          if(!seen.has(link.to)){seen.add(link.to);qq.push(link.to);}
        }
      }
    });
  }
  return result;
}
$('simPump').onclick=()=>{simPumpOn=!simPumpOn;$('simPump').classList.toggle('on',simPumpOn);$('simPump').setAttribute('aria-pressed',simPumpOn);$('pumpState').textContent=simPumpOn?'Ligada':'Desligada';renderSimGraph();};
document.querySelectorAll('[data-valve-state]').forEach(btn=>btn.onclick=()=>{valveState=btn.dataset.valveState;document.querySelectorAll('[data-valve-state]').forEach(b=>b.classList.toggle('chosen',b===btn));renderSimGraph();});

/* ---------- Inicialização ---------- */
refreshSavedGraphs();
demoGraph();
renderReference();
showArea('reference');
