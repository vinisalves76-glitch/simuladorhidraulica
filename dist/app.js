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
let pdfUrl='sy750h.pdf',pdfBlobUrl=null,refScale=1,pdfPageSize={w:2200,h:1200},builderPdfVisible=true,simPdfVisible=true;
const clonePalette=[
  {key:'red',name:'Rede vermelha',rgb:[255,0,0],hex:'#ff0000'},
  {key:'cyan',name:'Rede azul-claro',rgb:[0,191,255],hex:'#00bfff'},
  {key:'magenta',name:'Rede magenta',rgb:[255,0,255],hex:'#ff00ff'},
  {key:'orange',name:'Rede laranja',rgb:[204,102,0],hex:'#cc6600'},
  {key:'pink',name:'Rede rosa',rgb:[255,0,64],hex:'#ff0040'},
  {key:'blue',name:'Rede azul',rgb:[0,0,255],hex:'#0000ff'},
  {key:'teal',name:'Rede verde-azulada',rgb:[0,102,102],hex:'#006666'},
  {key:'green',name:'Rede verde',rgb:[0,255,0],hex:'#00ff00'}
];
let cloneImageData=null,cloneSelectedPixels=[],cloneSelectedColor=null,cloneAnimating=false;

function nearestCloneColor(r,g,b,maxDistance=115){
  let best=null,bestD=maxDistance*maxDistance;
  for(const p of clonePalette){
    const dr=r-p.rgb[0],dg=g-p.rgb[1],db=b-p.rgb[2],d=dr*dr+dg*dg+db*db;
    if(d<bestD){bestD=d;best=p;}
  }
  return best;
}
function clonePixelColor(data,idx){
  return nearestCloneColor(data[idx],data[idx+1],data[idx+2]);
}
function prepareCloneOverlay(){
  const src=$('refCanvas'),ov=$('cloneOverlay');
  ov.width=src.width;ov.height=src.height;
  ov.style.width='100%';ov.style.height='100%';
  cloneImageData=src.getContext('2d',{willReadFrequently:true}).getImageData(0,0,src.width,src.height);
  cloneSelectedPixels=[];cloneSelectedColor=null;clearCloneOverlay();
}
function detectCloneColors(){
  if(!cloneImageData)return [];
  const data=cloneImageData.data,w=$('refCanvas').width,h=$('refCanvas').height,counts=new Map();
  for(let y=0;y<h;y+=5){
    for(let x=0;x<w;x+=5){
      const i=(y*w+x)*4,p=clonePixelColor(data,i);
      if(p)counts.set(p.key,(counts.get(p.key)||0)+1);
    }
  }
  return clonePalette.filter(p=>counts.has(p.key)).map(p=>({...p,count:counts.get(p.key)}));
}
function clearCloneOverlay(){
  const ov=$('cloneOverlay');if(!ov)return;
  const ctx=ov.getContext('2d');ctx.clearRect(0,0,ov.width,ov.height);
  ov.classList.remove('flowing');
}
function paintClonePixels(pixels,color='rgba(255,215,0,.78)',limit=pixels.length){
  const ov=$('cloneOverlay'),ctx=ov.getContext('2d');
  ctx.clearRect(0,0,ov.width,ov.height);
  ctx.fillStyle=color;
  const upto=Math.min(limit,pixels.length);
  for(let i=0;i<upto;i++){const p=pixels[i];ctx.fillRect(p[0]-1,p[1]-1,3,3);}
}
function findColoredSeed(x,y){
  if(!cloneImageData)return null;
  const data=cloneImageData.data,w=$('refCanvas').width,h=$('refCanvas').height;
  for(let radius=0;radius<=18;radius++){
    for(let dy=-radius;dy<=radius;dy++){
      for(let dx=-radius;dx<=radius;dx++){
        if(Math.abs(dx)!==radius&&Math.abs(dy)!==radius)continue;
        const xx=Math.round(x+dx),yy=Math.round(y+dy);
        if(xx<0||yy<0||xx>=w||yy>=h)continue;
        const idx=(yy*w+xx)*4,p=clonePixelColor(data,idx);
        if(p)return{x:xx,y:yy,palette:p};
      }
    }
  }
  return null;
}
function traceCloneNetwork(seed,maxPixels=180000){
  const src=$('refCanvas'),w=src.width,h=src.height,data=cloneImageData.data;
  const target=seed.palette.key,visited=new Uint8Array(w*h),queueX=new Int32Array(maxPixels),queueY=new Int32Array(maxPixels);
  let head=0,tail=0;queueX[tail]=seed.x;queueY[tail]=seed.y;tail++;
  const pixels=[];
  const neighbors=[[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,-1],[-1,1],[1,1]];
  while(head<tail&&pixels.length<maxPixels){
    const x=queueX[head],y=queueY[head];head++;
    const pos=y*w+x;if(visited[pos])continue;visited[pos]=1;
    const idx=pos*4,p=clonePixelColor(data,idx);
    if(!p||p.key!==target)continue;
    pixels.push([x,y]);
    for(const [dx,dy] of neighbors){
      const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=w||ny>=h)continue;
      const np=ny*w+nx;if(!visited[np]&&tail<maxPixels){queueX[tail]=nx;queueY[tail]=ny;tail++;}
    }
  }
  return pixels;
}
function selectCloneAt(clientX,clientY){
  const ov=$('cloneOverlay'),rect=ov.getBoundingClientRect();
  const x=(clientX-rect.left)/rect.width*ov.width,y=(clientY-rect.top)/rect.height*ov.height;
  const seed=findColoredSeed(x,y);
  if(!seed){toast('Clique mais perto de uma linha colorida do esquema.');return;}
  cloneSelectedColor=seed.palette;
  cloneSelectedPixels=traceCloneNetwork(seed);
  paintClonePixels(cloneSelectedPixels);
  $('cloneSelectedTitle').textContent=seed.palette.name;
  $('cloneSelectedMeta').textContent=cloneSelectedPixels.length.toLocaleString('pt-BR')+' pixels conectados detectados a partir do ponto selecionado.';
  $('traceClone').disabled=false;$('animateClone').disabled=false;$('clearClone').disabled=false;
}
function runCloneAnimation(){
  if(!cloneSelectedPixels.length||cloneAnimating)return;
  cloneAnimating=true;let shown=0;
  const step=()=>{
    if(!cloneAnimating)return;
    shown=Math.min(cloneSelectedPixels.length,shown+Math.max(250,Math.floor(cloneSelectedPixels.length/90)));
    paintClonePixels(cloneSelectedPixels,'rgba(255,215,0,.88)',shown);
    if(shown<cloneSelectedPixels.length)requestAnimationFrame(step);
    else{cloneAnimating=false;$('cloneOverlay').classList.add('flowing');}
  };
  clearCloneOverlay();requestAnimationFrame(step);
}
async function initializeClone(page){
  const ov=$('cloneOverlay');
  prepareCloneOverlay();
  const [textContent,opList]=await Promise.all([page.getTextContent(),page.getOperatorList()]);
  const vectorCount=opList.fnArray.filter(fn=>fn===window.pdfjsLib.OPS.constructPath).length;
  const colors=detectCloneColors();
  $('cloneObjectCount').textContent=vectorCount.toLocaleString('pt-BR');
  $('cloneTextCount').textContent=textContent.items.length.toLocaleString('pt-BR');
  $('cloneColorCount').textContent=colors.length;
  const legend=$('cloneLegend');legend.innerHTML='';
  colors.forEach(p=>{
    const row=document.createElement('button');row.className='clone-color-row';
    row.innerHTML='<i style="background:'+p.hex+'"></i><span>'+p.name+'</span><small>detectada</small>';
    row.onclick=()=>{cloneSelectedColor=p;$('cloneSelectedTitle').textContent=p.name;$('cloneSelectedMeta').textContent='Cor detectada no PDF. Clique sobre uma linha desta cor para rastrear a conectividade geométrica.';};
    legend.append(row);
  });
  $('cloneStatus').textContent='Clone digital pronto';
  $('cloneDetail').textContent=vectorCount.toLocaleString('pt-BR')+' operações vetoriais e '+textContent.items.length.toLocaleString('pt-BR')+' textos identificados.';
  document.querySelector('#cloneBanner .clone-dot').classList.remove('loading');
  document.querySelector('#cloneBanner .clone-dot').classList.add('ready');
  ov.onclick=e=>selectCloneAt(e.clientX,e.clientY);
}
async function renderReference(){
  const canvas=$('refCanvas');
  try{
    $('cloneStatus').textContent='Preparando clone vetorial...';
    $('cloneDetail').textContent='Lendo os objetos do PDF.';
    if(!window.pdfjsLib) throw new Error('PDF.js indisponível');
    window.pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    const pdf=await window.pdfjsLib.getDocument(pdfUrl).promise;
    const page=await pdf.getPage(1);
    const base=page.getViewport({scale:1});
    const targetWidth=2200;
    const viewport=page.getViewport({scale:targetWidth/base.width});
    canvas.width=Math.round(viewport.width);
    canvas.height=Math.round(viewport.height);
    pdfPageSize={w:canvas.width,h:canvas.height};
    await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;
    applyRefScale();
    await initializeClone(page);
    await renderPdfBackgrounds();
  }catch(err){
    console.error(err);
    $('cloneStatus').textContent='Falha ao preparar clone';
    $('cloneDetail').textContent='O PDF continua disponível como referência.';
    toast('Não foi possível preparar o clone interativo deste PDF.');
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
$('traceClone').onclick=()=>{if(!cloneSelectedPixels.length){toast('Selecione primeiro uma linha no diagrama.');return;}paintClonePixels(cloneSelectedPixels);toast('Conectividade geométrica destacada. Cruze o resultado com o diagrama antes de validar.');};
$('animateClone').onclick=()=>runCloneAnimation();
$('clearClone').onclick=()=>{cloneAnimating=false;cloneSelectedPixels=[];cloneSelectedColor=null;clearCloneOverlay();$('cloneSelectedTitle').textContent='Nenhuma linha selecionada';$('cloneSelectedMeta').textContent='Clique em uma linha colorida no clone para inspecionar.';$('traceClone').disabled=true;$('animateClone').disabled=true;$('clearClone').disabled=true;};
$('rebuildClone').onclick=()=>renderReference();
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
async function renderPdfToCanvas(targetId){
  const canvas=$(targetId);if(!canvas)return;
  try{
    const pdf=await window.pdfjsLib.getDocument(pdfUrl).promise;
    const page=await pdf.getPage(1);
    const base=page.getViewport({scale:1});
    const targetWidth=2200;
    const viewport=page.getViewport({scale:targetWidth/base.width});
    canvas.width=Math.round(viewport.width);
    canvas.height=Math.round(viewport.height);
    await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;
  }catch(err){
    console.warn('Falha ao renderizar PDF no canvas '+targetId,err);
  }
}
async function renderPdfBackgrounds(){
  await Promise.all([renderPdfToCanvas('builderPdfCanvas'),renderPdfToCanvas('simPdfCanvas')]);
  syncWorkspaceSize();
}
function syncWorkspaceSize(){
  const ratio=pdfPageSize.h/pdfPageSize.w;
  const builder=$('circuitEditor'),sim=$('simEditor');
  [builder,sim].forEach(el=>{
    if(!el)return;
    const width=Math.max(el.parentElement?.clientWidth||1100,1100);
    el.style.width=width+'px';
    el.style.height=Math.round(width*ratio)+'px';
  });
  renderGraph();
  renderSimGraph();
}
$('togglePdfBg').onclick=()=>{builderPdfVisible=!builderPdfVisible;$('builderPdfCanvas').hidden=!builderPdfVisible;$('togglePdfBg').textContent=builderPdfVisible?'Ocultar PDF':'Mostrar PDF';};
$('toggleSimPdf').onclick=()=>{simPdfVisible=!simPdfVisible;$('simPdfCanvas').hidden=!simPdfVisible;$('toggleSimPdf').textContent=simPdfVisible?'Ocultar PDF':'Mostrar PDF';};


/* ---------- Modelo gráfico ---------- */
const GRAPH_KEY='hidrolab.graphs.v2';
const NODE_TYPES={
  tank:{label:'Reservatório',ports:[['T1','out'],['T2','out']],w:150,h:82},
  pump:{label:'Bomba',ports:[['S','in'],['P','out']],w:150,h:92},
  valve43:{label:'Válvula 4/3',ports:[['P','in'],['T','out'],['A','out'],['B','out']],w:184,h:112},
  cylinder:{label:'Cilindro D.A.',ports:[['A','in'],['B','in']],w:184,h:92},
  motor:{label:'Motor hidráulico',ports:[['A','in'],['B','out']],w:154,h:92},
  relief:{label:'Válvula de alívio',ports:[['P','in'],['T','out']],w:160,h:92},
  pilot:{label:'Comando piloto',ports:[['P','in'],['X','out']],w:160,h:92},
  generic:{label:'Componente detectado',ports:[],w:160,h:84}
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
    const spec=NODE_TYPES[node.type]||NODE_TYPES.generic;
    const nodePorts=(Array.isArray(node.ports)&&node.ports.length?node.ports.map(p=>[p.name||'?','io']):spec.ports);
    const el=document.createElement('div');
    el.className='hyd-node'+(node.id===selectedNodeId?' selected':'');
    el.dataset.nodeId=node.id;
    el.style.left=node.x+'px';el.style.top=node.y+'px';el.style.width=node.w+'px';el.style.height=node.h+'px';
    el.innerHTML='<div class="node-title">'+node.label+'</div><div class="node-symbol">'+nodeSymbol(node.type)+'</div>';
    nodePorts.forEach(([p,dir],i)=>{
      const port=document.createElement('button');
      port.type='button';port.className='port '+dir;
      port.dataset.node=node.id;port.dataset.port=p;
      port.title=node.label+' - porta '+p;
      const side=portSide(node.type,p,i,nodePorts.length);
      port.classList.add(side);
      const pos=portPositionStyle(node.type,p,i,nodePorts.length,side);
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

function portSide(type,p,i,total){
  if(type==='pump')return p==='S'?'left':'right';
  if(type==='tank')return 'top';
  if(type==='valve43')return (p==='P'||p==='T')?'bottom':'top';
  if(type==='cylinder')return 'bottom';
  if(type==='motor')return p==='A'?'left':'right';
  if(type==='relief')return p==='P'?'left':'right';
  if(type==='pilot')return p==='P'?'left':'right';
  if(type==='generic')return i%2?'right':'left';
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
  const ns=n?(NODE_TYPES[n.type]||NODE_TYPES.generic):null;
  const np=n?(Array.isArray(n.ports)&&n.ports.length?n.ports.map(p=>p.name||'?'):ns.ports.map(p=>p[0])):[];
  $('selectedMeta').textContent=n?ns.label+' · '+np.join(' / '):'Clique em um componente para editar.';
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
  const spec=NODE_TYPES[node.type]||NODE_TYPES.generic;
  const nodePorts=(Array.isArray(node.ports)&&node.ports.length?node.ports.map(p=>[p.name||'?','io']):spec.ports);
  const entry=Math.max(0,nodePorts.findIndex(p=>p[0]===port)),side=portSide(node.type,port,entry,nodePorts.length);
  const style=portPositionStyle(node.type,port,entry,nodePorts.length,side);
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
function normalizedPath(points,editor){
  if(!Array.isArray(points)||points.length<2)return '';
  const w=editor.clientWidth,h=editor.clientHeight;
  return points.map((p,i)=>{
    const x=Math.max(0,Math.min(w,(Number(p.x)||0)/1000*w));
    const y=Math.max(0,Math.min(h,(Number(p.y)||0)/1000*h));
    return (i?'L ':'M ')+x+' '+y;
  }).join(' ');
}
function edgePathD(edge,a,b,editor){
  const traced=normalizedPath(edge.path,editor);
  return traced||orthogonalPath(a,b);
}
function renderWires(){
  const svg=$('wireLayer');if(!svg)return;
  svg.setAttribute('viewBox','0 0 '+$('circuitEditor').clientWidth+' '+$('circuitEditor').clientHeight);
  svg.innerHTML='';
  graph.edges.forEach(edge=>{
    const aNode=nodeById(edge.from.node),bNode=nodeById(edge.to.node);if(!aNode||!bNode)return;
    const a=portCenter(aNode,edge.from.port),b=portCenter(bNode,edge.to.port);
    const path=document.createElementNS('http://www.w3.org/2000/svg','path');
    path.setAttribute('d',edgePathD(edge,a,b,$('circuitEditor')));
    path.setAttribute('class','wire '+edge.type+(edge.needsValidation?' needs-validation':''));
    path.dataset.edgeId=edge.id;
    if(edge.evidence)path.setAttribute('data-evidence',edge.evidence);
    svg.append(path);
  });
}
window.addEventListener('resize',()=>{syncWorkspaceSize();renderWires();renderSimGraph();});

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
$('builderFit').onclick=()=>{if(!graph.nodes.length){$('circuitEditor').parentElement.scrollTo(0,0);return;}const minX=Math.min(...graph.nodes.map(n=>n.x)),minY=Math.min(...graph.nodes.map(n=>n.y));graph.nodes.forEach(n=>{n.x=n.x-minX+40;n.y=n.y-minY+45;});renderGraph();$('circuitEditor').parentElement.scrollTo(0,0);};

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


/* ---------- Gemini: PDF -> reconstrução funcional ---------- */
const AI_ANALYSIS_KEY='hidrolab.ai.analysis.v3';
let aiAnalysis=null;

function setAiStatus(text,kind=''){
  const el=$('aiStatus');if(!el)return;
  el.textContent=text;el.className='ai-status'+(kind?' '+kind:'');
}
function setAiStep(step,state,label){
  const row=document.querySelector('[data-ai-step="'+step+'"]');if(!row)return;
  row.classList.remove('working','done','error');
  if(state)row.classList.add(state);
  const small=row.querySelector('small');if(small)small.textContent=label||({working:'Processando...',done:'Concluído',error:'Erro'}[state]||'Aguardando');
}
function resetAiSteps(){
  ['inventory','topology','functions'].forEach(s=>setAiStep(s,'','Aguardando'));
}
function mapAiType(type){
  const map={
    pump:'pump',tank:'tank',directional_valve:'valve43',main_control_valve_section:'valve43',
    travel_straight_valve:'valve43',cylinder:'cylinder',motor:'motor',relief_valve:'relief',
    pilot_valve:'pilot',pilot_manifold:'pilot',solenoid:'pilot'
  };
  return map[type]||'generic';
}
function aiComponentToNode(comp,index){
  const editor=$('circuitEditor');
  const w=Math.max(editor.clientWidth,1100),h=Math.max(editor.clientHeight,650);
  const bbox=Array.isArray(comp.bbox)&&comp.bbox.length===4?comp.bbox:[80,80,160,160];
  const ymin=Number(bbox[0])||0,xmin=Number(bbox[1])||0,ymax=Number(bbox[2])||0,xmax=Number(bbox[3])||0;
  const type=mapAiType(comp.type);
  const spec=NODE_TYPES[type]||NODE_TYPES.generic;
  const boxW=Math.max(80,Math.min(210,(xmax-xmin)/1000*w||spec.w));
  const boxH=Math.max(58,Math.min(135,(ymax-ymin)/1000*h||spec.h));
  return {
    id:String(comp.id||('ai_'+index)),
    sourceId:String(comp.id||('ai_'+index)),
    type,
    aiType:comp.type||'unknown',
    label:comp.label||comp.type||('Componente '+(index+1)),
    x:Math.max(4,xmin/1000*w),
    y:Math.max(4,ymin/1000*h),
    w:boxW,
    h:boxH,
    ports:Array.isArray(comp.ports)?comp.ports:[],
    confidence:Number(comp.confidence)||0,
    needsValidation:Boolean(comp.needsValidation),
    evidence:comp.evidence||''
  };
}
function updateAiSummary(){
  if(!aiAnalysis)return;
  const comps=aiAnalysis.inventory?.components||[];
  const conns=aiAnalysis.topology?.connections||[];
  const funcs=aiAnalysis.functionMap?.functions||[];
  $('aiComponents').textContent=comps.length;
  $('aiConnections').textContent=conns.length;
  $('aiFunctions').textContent=funcs.length;
  $('aiSummary').hidden=false;
  const warnings=[
    ...(aiAnalysis.inventory?.warnings||[]),
    ...(aiAnalysis.topology?.warnings||[]),
    ...(aiAnalysis.functionMap?.warnings||[])
  ];
  const pending=comps.filter(x=>x.needsValidation).length+
    conns.filter(x=>x.needsValidation).length+
    funcs.filter(x=>x.needsValidation).length;
  if(pending)warnings.unshift(pending+' itens exigem validação técnica.');
  $('aiWarnings').innerHTML=warnings.slice(0,8).map(w=>'<div>⚠ '+String(w).replace(/[<>]/g,'')+'</div>').join('');
}
function persistAiAnalysis(){
  try{localStorage.setItem(AI_ANALYSIS_KEY,JSON.stringify(aiAnalysis));}catch{}
  $('useLastAnalysis').hidden=false;
}
function restoreAiAnalysis(){
  try{
    const raw=localStorage.getItem(AI_ANALYSIS_KEY);if(!raw)return false;
    aiAnalysis=JSON.parse(raw);
    updateAiSummary();
    setAiStep('inventory','done');
    setAiStep('topology','done');
    setAiStep('functions','done');
    setAiStatus('Última análise carregada. Você pode gerar o circuito novamente.','ok');
    $('buildAiGraph').disabled=false;
    $('useLastAnalysis').hidden=false;
    return true;
  }catch{return false;}
}
function buildGraphFromAi(){
  if(!aiAnalysis?.inventory){toast('Execute a análise com Gemini primeiro.');return;}
  const inventory=aiAnalysis.inventory;
  const topology=aiAnalysis.topology||{connections:[]};
  const functionMap=aiAnalysis.functionMap||{functions:[]};
  const components=Array.isArray(inventory.components)?inventory.components:[];
  const connections=Array.isArray(topology.connections)?topology.connections:[];
  const nodes=components.map(aiComponentToNode);
  const ids=new Set(nodes.map(n=>n.id));
  const edges=connections.filter(e=>ids.has(String(e.fromComponentId))&&ids.has(String(e.toComponentId))).map((e,i)=>({
    id:String(e.id||('ai_edge_'+i)),
    type:['pressure','work','return','suction','pilot','drain'].includes(e.lineType)?e.lineType:'work',
    from:{node:String(e.fromComponentId),port:String(e.fromPort||'?')},
    to:{node:String(e.toComponentId),port:String(e.toPort||'?')},
    path:Array.isArray(e.path)?e.path:[],
    confidence:Number(e.confidence)||0,
    needsValidation:Boolean(e.needsValidation),
    evidence:e.evidence||''
  }));
  graph={
    name:inventory.title||('SY750H PRO - circuito reconstruído'),
    nodes,edges,source:'gemini-v3',
    warnings:[...(inventory.warnings||[]),...(topology.warnings||[])],
    functions:Array.isArray(functionMap.functions)?functionMap.functions:[],
    aiModel:aiAnalysis.model||''
  };
  $('graphName').value=graph.name;
  selectedNodeId=null;selectedPort=null;
  renderGraph();
  showArea('builder');
  const pending=nodes.filter(n=>n.needsValidation).length+edges.filter(e=>e.needsValidation).length;
  toast('Reconstrução gerada: '+nodes.length+' componentes, '+edges.length+' conexões e '+graph.functions.length+' funções. '+pending+' itens pedem validação.');
}
async function postAiPhase(phase,extra={}){
  const res=await fetch('/api/analisar-diagrama',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({phase,...extra})
  });
  const data=await res.json().catch(()=>({}));
  if(!res.ok)throw new Error(data.message||data.error||('HTTP '+res.status));
  return data;
}
async function analyzeWithGemini(){
  const btn=$('analyzeGemini');if(!btn)return;
  btn.disabled=true;$('buildAiGraph').disabled=true;$('aiSummary').hidden=true;$('aiWarnings').innerHTML='';
  resetAiSteps();
  aiAnalysis={model:'',inventory:null,topology:null,functionMap:null};
  try{
    setAiStep('inventory','working');
    setAiStatus('Fase 1/3: identificando componentes, portas e posições...','working');
    const inv=await postAiPhase('inventory');
    aiAnalysis.model=inv.model;aiAnalysis.inventory=inv.inventory;
    setAiStep('inventory','done',(inv.inventory?.components?.length||0)+' componentes');

    setAiStep('topology','working');
    setAiStatus('Fase 2/3: seguindo as linhas do esquema e reconstruindo conexões...','working');
    const top=await postAiPhase('topology',{inventory:aiAnalysis.inventory});
    aiAnalysis.topology=top.topology;
    setAiStep('topology','done',(top.topology?.connections?.length||0)+' conexões');

    setAiStep('functions','working');
    setAiStatus('Fase 3/3: identificando funções hidráulicas e caminhos de fluxo...','working');
    const fn=await postAiPhase('functions',{inventory:aiAnalysis.inventory,topology:aiAnalysis.topology});
    aiAnalysis.functionMap=fn.functionMap;
    setAiStep('functions','done',(fn.functionMap?.functions?.length||0)+' funções');

    updateAiSummary();persistAiAnalysis();
    setAiStatus('Reconstrução concluída com '+aiAnalysis.model+'. Gere o circuito e valide os itens sinalizados.','ok');
    $('buildAiGraph').disabled=false;
  }catch(err){
    console.error(err);
    const steps=['inventory','topology','functions'];
    const working=steps.find(s=>document.querySelector('[data-ai-step="'+s+'"]')?.classList.contains('working'));
    if(working)setAiStep(working,'error','Falhou');
    setAiStatus('Falha: '+err.message,'error');
    if(String(err.message).includes('GEMINI_API_KEY_NOT_CONFIGURED')||String(err.message).includes('Configure GEMINI_API_KEY')){
      $('aiWarnings').innerHTML='<div>Cadastre a variável GEMINI_API_KEY na Vercel e faça um novo deploy.</div>';
    }
  }finally{
    btn.disabled=false;
  }
}
$('analyzeGemini').onclick=()=>analyzeWithGemini();
$('buildAiGraph').onclick=()=>buildGraphFromAi();
$('useLastAnalysis').onclick=()=>{if(restoreAiAnalysis())toast('Última análise recuperada.');};

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

/* ---------- Simulação lógica / funções reconhecidas ---------- */
let simPumpOn=false,valveState='neutral',selectedFunctionId='';
const internalLinks={
  extend:[['P','A','pressure'],['B','T','return']],
  retract:[['P','B','pressure'],['A','T','return']],
  neutral:[]
};
function graphUsesAiFunctions(){
  return graph.source==='gemini-v3'&&Array.isArray(graph.functions)&&graph.functions.length>0;
}
function fillFunctionSelector(){
  const sel=$('simFunctionSelect');if(!sel)return;
  const funcs=Array.isArray(graph.functions)?graph.functions:[];
  sel.innerHTML='<option value="">Selecione uma função...</option>';
  funcs.forEach(fn=>{
    const o=document.createElement('option');
    o.value=fn.id;o.textContent=fn.name+(fn.needsValidation?' ⚠':'');
    sel.append(o);
  });
  if(funcs.length){selectedFunctionId=selectedFunctionId&&funcs.some(f=>f.id===selectedFunctionId)?selectedFunctionId:funcs[0].id;sel.value=selectedFunctionId;}
  else selectedFunctionId='';
  updateFunctionInfo();
}
function currentFunction(){
  return (graph.functions||[]).find(f=>f.id===selectedFunctionId)||null;
}
function updateFunctionInfo(){
  const info=$('simFunctionInfo');if(!info)return;
  const fn=currentFunction();
  if(!fn){info.textContent='Selecione uma função reconhecida pela análise.';return;}
  info.innerHTML='<strong>'+fn.name+'</strong><span>'+String(fn.description||fn.notes||'').replace(/[<>]/g,'')+'</span>'+
    '<small>Confiança: '+Math.round((Number(fn.confidence)||0)*100)+'%'+(fn.needsValidation?' · requer validação':'')+'</small>';
}
function prepareSimulation(){
  $('simGraphName').textContent=graph.name||'Circuito em desenvolvimento';
  simPumpOn=false;valveState='neutral';
  $('simPump').classList.remove('on');$('simPump').setAttribute('aria-pressed','false');$('pumpState').textContent='Desligada';
  const aiMode=graphUsesAiFunctions();
  $('aiFunctionControls').hidden=!aiMode;
  $('genericValveControls').hidden=aiMode;
  if(aiMode)fillFunctionSelector();
  document.querySelectorAll('[data-valve-state]').forEach(b=>b.classList.toggle('chosen',b.dataset.valveState==='neutral'));
  renderSimGraph();
}
function simPortCenter(node,port){
  const p=portCenter(node,port);
  return{x:p.x,y:p.y};
}
function functionEdgeStates(){
  const result=new Map(),fn=currentFunction();
  if(!simPumpOn||!fn)return result;
  const groups=[
    ['pilotConnectionIds','pilot'],
    ['pressureConnectionIds','pressure'],
    ['workConnectionIds','pressure'],
    ['returnConnectionIds','return'],
    ['drainConnectionIds','return']
  ];
  groups.forEach(([key,state])=>(fn[key]||[]).forEach(id=>result.set(String(id),state)));
  return result;
}
function renderSimGraph(){
  const layer=$('simNodeLayer'),svg=$('simWireLayer');if(!layer||!svg)return;
  layer.innerHTML='';svg.innerHTML='';
  svg.setAttribute('viewBox','0 0 '+$('simEditor').clientWidth+' '+$('simEditor').clientHeight);
  graph.nodes.forEach(n=>{
    const el=document.createElement('div');
    el.className='hyd-node sim-node'+(n.needsValidation?' needs-validation':'');
    el.style.left=n.x+'px';el.style.top=n.y+'px';el.style.width=n.w+'px';el.style.height=n.h+'px';
    el.innerHTML='<div class="node-title">'+n.label+'</div><div class="node-symbol">'+nodeSymbol(n.type)+'</div>';
    layer.append(el);
  });
  const active=graphUsesAiFunctions()?functionEdgeStates():computeGenericActiveEdges();
  graph.edges.forEach(edge=>{
    const a=nodeById(edge.from.node),b=nodeById(edge.to.node);if(!a||!b)return;
    const pa=simPortCenter(a,edge.from.port),pb=simPortCenter(b,edge.to.port);
    const path=document.createElementNS('http://www.w3.org/2000/svg','path');
    path.setAttribute('d',edgePathD(edge,pa,pb,$('simEditor')));
    const state=active.get(String(edge.id));
    path.setAttribute('class','wire sim-wire '+edge.type+(state?' active '+state:'')+(edge.needsValidation?' needs-validation':''));
    svg.append(path);
  });
  const pressure=[...active.values()].filter(v=>v==='pressure'||v==='pilot').length;
  const ret=[...active.values()].filter(v=>v==='return').length;
  $('pressureReadout').textContent=pressure;$('returnReadout').textContent=ret;
}
function computeGenericActiveEdges(){
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
  graph.edges.forEach(e=>connect(portKey(e.from.node,e.from.port),portKey(e.to.node,e.to.port),e.type,String(e.id)));
  if(valve)internalLinks[valveState].forEach(([a,b,kind])=>connect(portKey(valve.id,a),portKey(valve.id,b),kind,'internal:'+a+b));

  const source=portKey(pump.id,'P'),visited=new Set([source]),q=[source];
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
  if(valve){
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
$('simFit').onclick=()=>{$('simEditor').parentElement.scrollTo(0,0);};
$('simPump').onclick=()=>{
  if(graphUsesAiFunctions()&&!currentFunction()){toast('Selecione uma função hidráulica.');return;}
  simPumpOn=!simPumpOn;
  $('simPump').classList.toggle('on',simPumpOn);
  $('simPump').setAttribute('aria-pressed',simPumpOn);
  $('pumpState').textContent=simPumpOn?'Fluxo ativo':'Desligada';
  renderSimGraph();
};
$('simFunctionSelect').onchange=e=>{selectedFunctionId=e.target.value;updateFunctionInfo();renderSimGraph();};
document.querySelectorAll('[data-valve-state]').forEach(btn=>btn.onclick=()=>{
  valveState=btn.dataset.valveState;
  document.querySelectorAll('[data-valve-state]').forEach(b=>b.classList.toggle('chosen',b===btn));
  renderSimGraph();
});

/* ---------- Inicialização ---------- */
refreshSavedGraphs();
graph={name:'Circuito em desenvolvimento',nodes:[],edges:[]};
$('graphName').value=graph.name;
renderGraph();
restoreAiAnalysis();
renderReference();
showArea('reference');
