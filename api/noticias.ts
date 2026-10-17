const SOURCES=[['SENAMHI','https://www.gob.pe/senamhi','https://web2.senamhi.gob.pe/?p=avisos'],['INDECI','https://www.gob.pe/indeci','https://geosinpad.indeci.gob.pe/indeci/rest/services/Emergencias'],['ANA','https://www.gob.pe/ana','https://www.ana.gob.pe/'],['ENFEN','https://enfen.imarpe.gob.pe/','https://enfen.imarpe.gob.pe/comunicados/']] as const;

async function obtenerEnfenItems(){
  try{
    const response=await fetch('https://enfen.imarpe.gob.pe/downloads/comunicados/',{signal:AbortSignal.timeout(10000),headers:{Accept:'text/html'}});
    if(!response.ok)return[];
    const html=await response.text();
    const matches=[...html.matchAll(/Comunicado Oficial Enfen N°\s*([^<\n]+?)(?=<|\s{2,})/gi)];
    return [...new Set(matches.map(m=>m[1].trim()))].slice(0,8).map((number,index)=>({source:'ENFEN',title:`Comunicado Oficial Enfen N° ${number}`,summary:'Publicación oficial de ENFEN sobre la evolución del Fenómeno El Niño y La Niña.',url:'https://enfen.imarpe.gob.pe/comunicados/',date:index===0?'Último comunicado oficial':'Archivo oficial'}));
  }catch{return[]}
}

export async function responder(path:string,url?:string|null){
  if(path.endsWith('/noticias')){
    const enfen=await obtenerEnfenItems();
    const sourceItems=SOURCES.map(([source,link,dataUrl])=>({source,title:`Comunicados y avisos oficiales de ${source}`,summary:`Acceso directo a la información publicada por ${source}.`,url:dataUrl,date:'Fuente oficial'}));
    return{status:200,body:JSON.stringify({items:[...enfen,...sourceItems]})};
  }
  if(path.endsWith('/nota')&&url)return{status:200,body:JSON.stringify({url})};
  return{status:404,body:JSON.stringify({error:'Ruta no encontrada'})};
}
export const handler=async()=>{const r=await responder('/noticias');return{statusCode:r.status,headers:{'Content-Type':'application/json; charset=utf-8','Access-Control-Allow-Origin':'*','Cache-Control':'public, max-age=300'},body:r.body};};
