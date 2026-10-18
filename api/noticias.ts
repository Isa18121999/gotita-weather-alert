const OFFICIAL_SOURCES=[
  ['SENAMHI','https://www.gob.pe/senamhi','https://web2.senamhi.gob.pe/?p=avisos'],
  ['INDECI','https://www.gob.pe/indeci','https://geosinpad.indeci.gob.pe/indeci/rest/services/Emergencias'],
  ['ANA','https://www.gob.pe/ana','https://www.ana.gob.pe/'],
  ['ENFEN','https://enfen.imarpe.gob.pe/','https://enfen.imarpe.gob.pe/comunicados/']
] as const;

const EXTERNAL_SOURCES=[
  {source:'RPP Noticias',type:'noticia',url:'https://rpp.pe/noticias/clima',dataUrl:'https://rpp.pe/rss',summary:'Noticias de clima, lluvias, El Niño y emergencias publicadas por RPP Noticias.'},
  {source:'Agencia Andina',type:'noticia',url:'https://andina.pe/agencia/',dataUrl:'https://andina.pe/agencia/',summary:'Noticias nacionales sobre clima, lluvias, El Niño y prevención.'},
  {source:'SENAMHI en X',type:'x',url:'https://x.com/Senamhiperu',dataUrl:'https://x.com/Senamhiperu',summary:'Publicaciones de la cuenta oficial de SENAMHI en X.'},
  {source:'ENFEN en X',type:'x',url:'https://x.com/enfenperu',dataUrl:'https://x.com/enfenperu',summary:'Publicaciones de la cuenta oficial de ENFEN en X.'},
  {source:'INDECI en X',type:'x',url:'https://x.com/indeciperu',dataUrl:'https://x.com/indeciperu',summary:'Publicaciones de la cuenta oficial de INDECI en X.'}
] as const;

const KEYWORDS=/lluvia|lluvias|precipit|senamhi|clima|fen[oó]meno el ni[ñn]o|el ni[ñn]o costero|inundaci|huaico|huayco|emergencia|alerta|viento|temperatura|friaje|dana/i;

function clean(value:string){return value.replace(/<!\[CDATA\[|\]\]>/g,'').replace(/<[^>]+>/g,' ').replace(/&amp;/g,'&').replace(/&#39;|&apos;/g,"'").replace(/&quot;/g,'"').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/\s+/g,' ').trim();}

async function obtenerRppItems(){
  try{
    const response=await fetch('https://rpp.pe/rss',{signal:AbortSignal.timeout(10000),headers:{Accept:'application/rss+xml, application/xml, text/xml'}});
    if(!response.ok)return[];
    const xml=await response.text();
    return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].map(match=>{
      const block=match[1];
      const title=clean(block.match(/<title>([\s\S]*?)<\/title>/i)?.[1]??'');
      const url=clean(block.match(/<link>([\s\S]*?)<\/link>/i)?.[1]??'');
      const date=clean(block.match(/<pubDate>([\s\S]*?)<\/pubDate>/i)?.[1]??'');
      return {source:'RPP Noticias',type:'noticia',title,url,date,summary:'Noticia de RPP relacionada con clima, lluvias, El Niño, emergencias o prevención.'};
    }).filter(item=>item.title&&item.url&&KEYWORDS.test(item.title)).slice(0,8);
  }catch{return[]}
}

async function obtenerAndinaItems(){
  try{
    const response=await fetch('https://andina.pe/agencia/',{signal:AbortSignal.timeout(10000),headers:{Accept:'text/html'}});
    if(!response.ok)return[];
    const html=await response.text();
    const items:{source:string;type:string;title:string;url:string;date:string;summary:string}[]=[];
    const seen=new Set<string>();
    for(const match of html.matchAll(/<a[^>]+href=["'](\/agencia\/noticia-[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)){
      const title=clean(match[2]);
      const url=new URL(match[1],'https://andina.pe').toString();
      if(title&&KEYWORDS.test(title)&&!seen.has(url)){seen.add(url);items.push({source:'Agencia Andina',type:'noticia',title,url,date:'Últimas noticias',summary:'Noticia de Agencia Andina relacionada con clima, lluvias, El Niño, emergencias o prevención.'});}
      if(items.length>=8)break;
    }
    return items;
  }catch{return[]}
}

async function obtenerEnfenItems(){
  try{
    const response=await fetch('https://enfen.imarpe.gob.pe/downloads/comunicados/',{signal:AbortSignal.timeout(10000),headers:{Accept:'text/html'}});
    if(!response.ok)return[];
    const html=await response.text();
    const matches=[...html.matchAll(/Comunicado Oficial Enfen N°\s*([^<\n]+?)(?=<|\s{2,})/gi)];
    return [...new Set(matches.map(m=>m[1].trim()))].slice(0,8).map((number,index)=>({source:'ENFEN',type:'oficial',title:`Comunicado Oficial Enfen N° ${number}`,summary:'Publicación oficial de ENFEN sobre la evolución del Fenómeno El Niño y La Niña.',url:'https://enfen.imarpe.gob.pe/comunicados/',date:index===0?'Último comunicado oficial':'Archivo oficial'}));
  }catch{return[]}
}

export async function responder(path:string,url?:string|null){
  if(path.endsWith('/noticias')){
    const [enfen,rpp,andina]=await Promise.all([obtenerEnfenItems(),obtenerRppItems(),obtenerAndinaItems()]);
    const officialItems=OFFICIAL_SOURCES.map(([source,link,dataUrl])=>({source,type:'oficial',title:`Comunicados y avisos oficiales de ${source}`,summary:`Acceso directo a la información publicada por ${source}.`,url:dataUrl,date:'Fuente oficial'}));
    const xItems=EXTERNAL_SOURCES.filter(item=>item.type==='x').map(item=>({source:item.source,type:item.type,title:`Últimas publicaciones de ${item.source}`,summary:item.summary,url:item.url,date:'Cuenta oficial en X'}));
    return{status:200,body:JSON.stringify({items:[...enfen,...rpp,...andina,...officialItems,...xItems],externalSources:EXTERNAL_SOURCES})};
  }
  if(path.endsWith('/nota')&&url)return{status:200,body:JSON.stringify({url})};
  return{status:404,body:JSON.stringify({error:'Ruta no encontrada'})};
}

export const handler=async()=>{const r=await responder('/noticias');return{statusCode:r.status,headers:{'Content-Type':'application/json; charset=utf-8','Access-Control-Allow-Origin':'*','Cache-Control':'public, max-age=300'},body:r.body};};
