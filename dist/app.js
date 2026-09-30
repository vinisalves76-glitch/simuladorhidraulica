const $=id=>document.getElementById(id);
const components=[
 ['Comandos piloto','Comandos manuais e pedais','Região dos comandos de pilotagem. A leitura das linhas permite acompanhar como o sinal chega ao conjunto de válvulas.',23,31],
 ['Bloco de válvulas','Distribuição do fluxo','Conjunto central de válvulas. Nesta etapa, o marcador localiza a região; a identificação de cada carretel e de suas ligações será feita no mapeamento.',49,37],
 ['Conjunto de bombas','Geração de vazão','Região inferior esquerda que reúne bombas e elementos de controle. Consulte o desenho original para identificar as portas e regulagens.',21,74],
 ['Motores hidráulicos','Atuadores rotativos','À direita estão conjuntos com motores hidráulicos. A associação de cada conjunto à função da máquina deve ser conferida com as identificações do esquema.',79,27],
 ['Cilindros','Atuadores lineares','Os cilindros aparecem na parte inferior direita, ligados por referências de portas. A simulação da outra aba usa um cilindro genérico de dupla ação.',81,80]
];
let selected=0,zoom=100,custom=false,blobURL=null;
function selectComponent(i,focus=false){selected=i;const c=components[i];$('detailTag').textContent='REGIÃO 0'+(i+1);$('detailTitle').textContent=c[1];$('detailText').textContent=c[2];document.querySelectorAll('[data-component]').forEach(e=>e.classList.toggle('selected',Number(e.dataset.component)===i));if(focus&&!custom){setZoom(175);requestAnimationFrame(()=>{const d=$('drawing'),v=$('viewport');v.scrollTo({left:d.offsetWidth*c[3]/100-v.clientWidth/2,top:d.offsetHeight*c[4]/100-v.clientHeight/2,behavior:'smooth'});});}}
components.forEach((c,i)=>{const b=document.createElement('button');b.className='component';b.dataset.component=i;b.innerHTML='<span class="num">0'+(i+1)+'</span>'+c[0];b.onclick=()=>selectComponent(i,true);$('componentList').append(b);const m=document.createElement('button');m.className='marker';m.dataset.component=i;m.textContent=i+1;m.style.left=c[3]+'%';m.style.top=c[4]+'%';m.setAttribute('aria-label',c[0]);m.onclick=()=>selectComponent(i);$('markers').append(m);});selectComponent(0);
function setZoom(z){zoom=Math.max(100,Math.min(400,z));$('drawing').style.width=zoom+'%';$('zoomLabel').textContent=zoom+'%';}
$('zoomIn').onclick=()=>setZoom(zoom+25);$('zoomOut').onclick=()=>setZoom(zoom-25);$('fit').onclick=()=>{setZoom(100);$('viewport').scrollTo(0,0);};$('expand').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.querySelector('.viewer').requestFullscreen();}catch{toast('Use a ampliação do navegador para ver o esquema em tela maior.');}};
let drag=null;$('viewport').addEventListener('pointerdown',e=>{if(e.pointerType==='touch'||e.target.closest('button')||custom)return;drag={x:e.clientX,y:e.clientY,l:$('viewport').scrollLeft,t:$('viewport').scrollTop};$('viewport').classList.add('dragging');$('viewport').setPointerCapture(e.pointerId);});$('viewport').addEventListener('pointermove',e=>{if(!drag)return;$('viewport').scrollLeft=drag.l-e.clientX+drag.x;$('viewport').scrollTop=drag.t-e.clientY+drag.y;});for(const ev of ['pointerup','pointercancel'])$('viewport').addEventListener(ev,()=>{drag=null;$('viewport').classList.remove('dragging');});
function showArea(area){const explore=area==='explore',mapping=area==='mapping',sim=area==='sim';$('explore').hidden=!explore;$('mapping').hidden=!mapping;$('simulation').hidden=!sim;$('exploreTab').classList.toggle('active',explore);$('mapTab').classList.toggle('active',mapping);$('simTab').classList.toggle('active',sim);$('exploreTab').setAttribute('aria-selected',explore);$('mapTab').setAttribute('aria-selected',mapping);$('simTab').setAttribute('aria-selected',sim);if(mapping)renderMap();if(sim){ensureSimDiagram();fillSimMaps();loadSimSelection();}}
function tab(sim){showArea(sim?'sim':'explore');}
$('exploreTab').onclick=()=>showArea('explore');$('mapTab').onclick=()=>showArea('mapping');$('simTab').onclick=()=>showArea('sim');$('goSim').onclick=()=>showArea('mapping');
let toastTimer;function toast(t){$('toast').textContent=t;$('toast').style.display='block';clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').style.display='none',5500);}
const MAP_STORAGE_KEY='hidrolab.maps.v1';let mapZoom=100,mapDraft=null,mapLines=[],mapPlayback=false,mapTimer=null,mapPdfReady=false;
const mapColors={pressure:'#ef4444',return:'#0ea5e9',pilot:'#d946ef',drain:'#f59e0b'};
const demoMap={
  name:'Elevação da lança - DEMO NÃO VALIDADO',
  lines:[
    {type:'pilot',label:'DEMO - comando piloto (não validado)',points:[{x:245,y:145},{x:315,y:210},{x:430,y:235}]},
    {type:'pressure',label:'DEMO - alimentação principal (não validada)',points:[{x:220,y:720},{x:360,y:630},{x:500,y:450},{x:620,y:280},{x:775,y:205}]},
    {type:'return',label:'DEMO - retorno ao tanque (não validado)',points:[{x:780,y:250},{x:675,y:390},{x:570,y:610},{x:455,y:730},{x:310,y:790}]}
  ]
};
async function renderFullMapPdf(){
  const canvas=$('mapCanvas'),fallback=$('mapFallback');
  if(!canvas)return;
  try{
    if(!window.pdfjsLib)throw new Error('PDF.js indisponível');
    window.pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    const pdf=await window.pdfjsLib.getDocument('sy750h.pdf').promise;
    const page=await pdf.getPage(1);
    const base=page.getViewport({scale:1});
    const targetWidth=2200;
    const scale=targetWidth/base.width;
    const viewport=page.getViewport({scale});
    canvas.width=Math.round(viewport.width);
    canvas.height=Math.round(viewport.height);
    canvas.style.aspectRatio=canvas.width+'/'+canvas.height;
    await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;
    fallback.hidden=true;
    canvas.hidden=false;
    mapPdfReady=true;
  }catch(err){
    canvas.hidden=true;
    fallback.hidden=false;
    mapPdfReady=false;
    console.warn('Falha ao renderizar PDF completo no editor:',err);
    toast('Não foi possível renderizar o PDF completo. Exibindo a imagem de apoio.');
  }
}
function loadDemoMap(){
  $('mapName').value=demoMap.name;
  mapLines=demoMap.lines.map(l=>({...l,points:l.points.map(p=>({...p}))}));
  mapDraft=null;
  updateDraftStatus();
  renderMap();
}

function setMapZoom(z){mapZoom=Math.max(100,Math.min(400,z));$('mapDrawing').style.width=mapZoom+'%';$('mapZoomLabel').textContent=mapZoom+'%';}
function rawMapPoint(e){const rect=$('mapDrawing').getBoundingClientRect();return{x:Math.max(0,Math.min(1000,(e.clientX-rect.left)/rect.width*1000)),y:Math.max(0,Math.min(1000,(e.clientY-rect.top)/rect.height*1000))};}
function snapToDiagram(pt){
  if(!$('snapDiagram')?.checked||!mapPdfReady)return pt;
  const canvas=$('mapCanvas'),ctx=canvas.getContext('2d',{willReadFrequently:true});
  const px=pt.x/1000*canvas.width,py=pt.y/1000*canvas.height;
  const radius=Math.max(10,Math.round(canvas.width/220));
  const x0=Math.max(0,Math.floor(px-radius)),y0=Math.max(0,Math.floor(py-radius));
  const w=Math.min(canvas.width-x0,radius*2+1),h=Math.min(canvas.height-y0,radius*2+1);
  let data;try{data=ctx.getImageData(x0,y0,w,h).data}catch{return pt}
  let best=null,bestScore=Infinity;
  for(let y=0;y<h;y+=1)for(let x=0;x<w;x+=1){
    const i=(y*w+x)*4,r=data[i],g=data[i+1],b=data[i+2],a=data[i+3];
    if(a<80)continue;
    const max=Math.max(r,g,b),min=Math.min(r,g,b),sat=max-min;
    const isInk=min<185||sat>42;
    if(!isInk)continue;
    const dx=(x0+x)-px,dy=(y0+y)-py,dist=dx*dx+dy*dy;
    const textPenalty=(max<90&&sat<18)?18:0;
    const score=dist+textPenalty;
    if(score<bestScore){bestScore=score;best={x:(x0+x)/canvas.width*1000,y:(y0+y)/canvas.height*1000};}
  }
  return best||pt;
}
function mapPoint(e){
  let pt=snapToDiagram(rawMapPoint(e));
  if($('orthogonalMode')?.checked&&mapDraft?.points?.length){
    const prev=mapDraft.points[mapDraft.points.length-1],dx=Math.abs(pt.x-prev.x),dy=Math.abs(pt.y-prev.y);
    if(dx>dy)pt={x:pt.x,y:prev.y};else pt={x:prev.x,y:pt.y};
    pt=snapToDiagram(pt);
  }
  return pt;
}
function polyline(points){return points.map(p=>p.x.toFixed(1)+','+p.y.toFixed(1)).join(' ');}
function renderMap(){if(!$('mapOverlay'))return;const svg=$('mapOverlay');svg.innerHTML='';const all=mapDraft&&mapDraft.points.length?[...mapLines,{...mapDraft,draft:true}]:mapLines;all.forEach((line,i)=>{if(!line.points||line.points.length<1)return;const g=document.createElementNS('http://www.w3.org/2000/svg','g');g.dataset.line=i;const p=document.createElementNS('http://www.w3.org/2000/svg','polyline');p.setAttribute('points',polyline(line.points));p.setAttribute('fill','none');p.setAttribute('stroke',mapColors[line.type]||'#334155');p.setAttribute('stroke-width',line.draft?'2.2':'2.8');p.setAttribute('stroke-linecap','round');p.setAttribute('stroke-linejoin','round');p.classList.add('map-path');if(mapPlayback&&!line.draft)p.classList.add('playing');g.append(p);line.points.forEach((pt,j)=>{const c=document.createElementNS('http://www.w3.org/2000/svg','circle');c.setAttribute('cx',pt.x);c.setAttribute('cy',pt.y);c.setAttribute('r',j===0||j===line.points.length-1?'8':'6');c.setAttribute('fill','#fff');c.setAttribute('stroke',mapColors[line.type]||'#334155');c.setAttribute('stroke-width','4');g.append(c);});svg.append(g);});renderMapList();}
function renderMapList(){if(!$('mapLineList'))return;$('lineCount').textContent=mapLines.length;$('mapLineList').innerHTML='';mapLines.forEach((line,i)=>{const row=document.createElement('div');row.className='mapline';row.innerHTML='<span class="swatch" style="background:'+(mapColors[line.type]||'#334155')+'"></span><div><strong>'+(line.label||('Linha '+(i+1)))+'</strong><small>'+line.points.length+' pontos</small></div><button data-remove-line="'+i+'" aria-label="Excluir linha">×</button>';$('mapLineList').append(row);});document.querySelectorAll('[data-remove-line]').forEach(b=>b.onclick=()=>{mapLines.splice(Number(b.dataset.removeLine),1);renderMap();});}
function updateDraftStatus(){if(!mapDraft){$('lineDraftStatus').textContent='Nenhuma linha em edição.';return;}$('lineDraftStatus').textContent='Linha em edição: '+mapDraft.points.length+' ponto(s). Clique no esquema para adicionar pontos.';}
$('mapViewport').addEventListener('click',e=>{if(!mapDraft||e.target.closest('button'))return;mapDraft.points.push(mapPoint(e));updateDraftStatus();renderMap();});
$('startLine').onclick=()=>{mapDraft={type:$('mapLineType').value,label:$('mapLineLabel').value.trim(),points:[]};updateDraftStatus();renderMap();toast('Clique no esquema para marcar o caminho.');};
$('finishLine').onclick=()=>{if(!mapDraft)return;if(mapDraft.points.length<2){toast('Marque pelo menos dois pontos para formar uma linha.');return;}mapDraft.label=mapDraft.label||$('mapLineLabel').value.trim()||('Linha '+(mapLines.length+1));mapLines.push(mapDraft);mapDraft=null;$('mapLineLabel').value='';updateDraftStatus();renderMap();};
$('undoPoint').onclick=()=>{if(!mapDraft||!mapDraft.points.length)return;mapDraft.points.pop();updateDraftStatus();renderMap();};
$('mapZoomIn').onclick=()=>setMapZoom(mapZoom+25);$('mapZoomOut').onclick=()=>setMapZoom(mapZoom-25);$('mapFit').onclick=()=>{setMapZoom(100);$('mapViewport').scrollTo(0,0);};
function savedMapData(){try{return JSON.parse(localStorage.getItem(MAP_STORAGE_KEY)||'{}')}catch{return{}}}
function refreshSavedMaps(){const data=savedMapData(),sel=$('savedMaps'),current=sel.value;sel.innerHTML='<option value="">Selecione...</option>';Object.keys(data).sort().forEach(k=>{const o=document.createElement('option');o.value=k;o.textContent=k;sel.append(o);});if(data[current])sel.value=current;}
$('saveMap').onclick=()=>{const name=$('mapName').value.trim();if(!name){toast('Digite o nome da função antes de salvar.');return;}if(!mapLines.length){toast('Adicione ao menos uma linha ao mapa.');return;}const data=savedMapData();data[name]={name,lines:mapLines,updatedAt:new Date().toISOString(),source:'SY750H PRO - diagrama fornecido pelo usuário'};localStorage.setItem(MAP_STORAGE_KEY,JSON.stringify(data));refreshSavedMaps();$('savedMaps').value=name;toast('Função salva neste navegador.');};
$('loadMap').onclick=()=>{const name=$('savedMaps').value,data=savedMapData();if(!name||!data[name])return;$('mapName').value=data[name].name||name;mapLines=Array.isArray(data[name].lines)?data[name].lines:[];mapDraft=null;updateDraftStatus();renderMap();toast('Mapa carregado.');};
$('deleteMap').onclick=()=>{const name=$('savedMaps').value;if(!name)return;const data=savedMapData();delete data[name];localStorage.setItem(MAP_STORAGE_KEY,JSON.stringify(data));mapLines=[];$('mapName').value='';refreshSavedMaps();renderMap();toast('Mapa excluído deste navegador.');};
$('loadDemo').onclick=()=>{loadDemoMap();toast('Demonstração não validada carregada para teste visual.');};
$('playMap').onclick=()=>{if(!mapLines.length){toast('Crie ou carregue um mapa antes de reproduzir.');return;}mapPlayback=true;renderMap();clearTimeout(mapTimer);mapTimer=setTimeout(()=>{mapPlayback=false;renderMap();},12000);};
$('stopMap').onclick=()=>{mapPlayback=false;clearTimeout(mapTimer);renderMap();};
$('exportMaps').onclick=()=>{const data=JSON.stringify({format:'HidroLabMapV1',exportedAt:new Date().toISOString(),maps:savedMapData()},null,2),blob=new Blob([data],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='hidrolab-mapeamentos.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),500);};
$('importMaps').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{const parsed=JSON.parse(await f.text()),incoming=parsed.maps||parsed;if(!incoming||typeof incoming!=='object'||Array.isArray(incoming))throw new Error('invalid');const merged={...savedMapData(),...incoming};localStorage.setItem(MAP_STORAGE_KEY,JSON.stringify(merged));refreshSavedMaps();toast('Mapeamentos importados.');}catch{toast('Arquivo de mapeamento inválido.');}e.target.value='';};
setMapZoom(100);refreshSavedMaps();updateDraftStatus();renderFullMapPdf().then(()=>{loadDemoMap();});

$('pdfFile').onchange=async e=>{const f=e.target.files[0];if(!f)return;if(f.size>40*1024*1024){toast('Escolha um PDF de até 40 MB.');return;}const signature=await f.slice(0,5).text();if(signature!=='%PDF-'){toast('O arquivo selecionado não é um PDF válido.');return;}if(blobURL)URL.revokeObjectURL(blobURL);blobURL=URL.createObjectURL(f);custom=true;$('drawing').hidden=true;$('pdfViewer').hidden=false;$('pdfViewer').src=blobURL;$('filename').textContent=f.name;$('docmeta').textContent='PDF local · aberto somente neste navegador';$('restore').hidden=false;$('componentList').hidden=true;document.querySelector('.detail').hidden=true;$('goSim').textContent='Abrir simulação genérica';$('viewerHint').textContent='Use os controles do leitor de PDF para navegar';document.querySelector('.viewerfoot a').href=blobURL;['zoomIn','zoomOut','fit'].forEach(id=>$(id).disabled=true);showArea('explore');toast('PDF aberto para consulta. O editor de mapeamento continua vinculado ao esquema SY750H original.');};
$('restore').onclick=()=>{custom=false;$('drawing').hidden=false;$('pdfViewer').hidden=true;$('pdfViewer').removeAttribute('src');if(blobURL)URL.revokeObjectURL(blobURL);blobURL=null;$('filename').textContent='SY750H PRO';$('docmeta').textContent='Esquema hidráulico · 1 página';$('restore').hidden=true;$('componentList').hidden=false;document.querySelector('.detail').hidden=false;$('goSim').textContent='Experimentar a simulação';$('viewerHint').textContent='Arraste para navegar · Use + e − para ampliar';document.querySelector('.viewerfoot a').href='sy750h.pdf';['zoomIn','zoomOut','fit'].forEach(id=>$(id).disabled=false);$('pdfFile').value='';setZoom(100);};
let simZoom=100,simOn=false,simLines=[];
function setSimZoom(z){simZoom=Math.max(100,Math.min(400,z));$('simDrawing').style.width=simZoom+'%';$('simZoomLabel').textContent=simZoom+'%';}
async function ensureSimDiagram(){
  const target=$('simCanvas');if(!target)return;
  const source=$('mapCanvas');
  if(source&&source.width&&source.height){
    target.width=source.width;target.height=source.height;target.style.aspectRatio=source.width+'/'+source.height;
    target.getContext('2d').drawImage(source,0,0);return;
  }
  try{
    const pdf=await window.pdfjsLib.getDocument('sy750h.pdf').promise,page=await pdf.getPage(1),base=page.getViewport({scale:1}),scale=2200/base.width,viewport=page.getViewport({scale});
    target.width=Math.round(viewport.width);target.height=Math.round(viewport.height);target.style.aspectRatio=target.width+'/'+target.height;
    await page.render({canvasContext:target.getContext('2d'),viewport}).promise;
  }catch(err){console.warn('Falha ao preparar diagrama da simulação',err);}
}
function renderSim(){
  const svg=$('simOverlay');if(!svg)return;svg.innerHTML='';
  const phase=$('simPhase')?.value||'all';
  const visible=simLines.filter(line=>phase==='all'||line.type===phase);
  visible.forEach((line,i)=>{
    if(!line.points||line.points.length<2)return;
    const base=document.createElementNS('http://www.w3.org/2000/svg','polyline');
    base.setAttribute('points',polyline(line.points));base.setAttribute('fill','none');base.setAttribute('stroke',mapColors[line.type]||'#334155');base.setAttribute('stroke-width','2.4');base.setAttribute('stroke-linecap','round');base.setAttribute('stroke-linejoin','round');base.setAttribute('opacity',simOn?'.95':'.34');base.classList.add('sim-route');
    if(simOn)base.classList.add('active');svg.append(base);
  });
  const counts={pressure:0,return:0,pilot:0,drain:0};simLines.forEach(l=>{if(counts[l.type]!==undefined)counts[l.type]++;});
  $('simPressureCount').textContent=counts.pressure;$('simReturnCount').textContent=counts.return;$('simPilotCount').textContent=counts.pilot;$('simDrainCount').textContent=counts.drain;
  $('simPump').classList.toggle('on',simOn);$('simPump').setAttribute('aria-pressed',simOn);$('simPumpStatus').textContent=simOn?'Fluxo animado':'Parado';
}
function fillSimMaps(){
  const sel=$('simMapSelect'),current=sel.value;sel.innerHTML='<option value="__current">Mapa atual do editor</option>';
  const data=savedMapData();Object.keys(data).sort().forEach(name=>{const o=document.createElement('option');o.value=name;o.textContent=name;sel.append(o);});
  if([...sel.options].some(o=>o.value===current))sel.value=current;
}
function loadSimSelection(){
  const key=$('simMapSelect').value;
  if(key==='__current'){simLines=mapLines.map(l=>({...l,points:l.points.map(p=>({...p}))}));$('simFunctionTitle').textContent=$('mapName').value.trim()||'Mapa atual do editor';}
  else{const data=savedMapData()[key];simLines=data&&Array.isArray(data.lines)?data.lines.map(l=>({...l,points:l.points.map(p=>({...p}))})):[];$('simFunctionTitle').textContent=key||'Função mapeada';}
  simOn=false;renderSim();
  if(!simLines.length)toast('Esta função ainda não possui linhas mapeadas.');
}
$('simPump').onclick=()=>{if(!simLines.length){toast('Mapeie uma função antes de iniciar o fluxo.');return;}simOn=!simOn;renderSim();};
$('simStop').onclick=()=>{simOn=false;renderSim();};
$('simPhase').onchange=()=>renderSim();
$('simLoadMap').onclick=()=>loadSimSelection();
$('simBackToMap').onclick=()=>showArea('mapping');
$('simZoomIn').onclick=()=>setSimZoom(simZoom+25);$('simZoomOut').onclick=()=>setSimZoom(simZoom-25);$('simFit').onclick=()=>{setSimZoom(100);$('simViewport').scrollTo(0,0);};
setSimZoom(100);ensureSimDiagram();fillSimMaps();loadSimSelection();

$('openPdf').onclick=()=>$('pdfFile').click();
