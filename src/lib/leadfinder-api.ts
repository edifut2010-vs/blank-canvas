import { createServerFn } from "@tanstack/react-start";

type SearchInput = { country:string; city:string; region?:string; niche:string; withoutWebsite?:boolean; phoneOnly?:boolean; minRating?:number; minReviews?:number };
type AiInput = { task:"analysis"|"website"|"outreach"|"translate"; lead:Record<string,unknown>; context?:string; tone?:string; channel?:string; language?:string };
const env=(key:string,fallback="")=>process.env[key]||fallback;

export const getIntegrationStatus=createServerFn({method:"GET"}).handler(async()=>({googleMaps:Boolean(env("GOOGLE_MAPS_API_KEY")),ai:Boolean(env("AI_API_KEY")),aiModel:env("AI_MODEL","gpt-4o-mini")}));

export const searchPlaces=createServerFn({method:"POST"}).inputValidator((data:SearchInput)=>data).handler(async({data})=>{
 const key=env("GOOGLE_MAPS_API_KEY");
 if(!key) throw new Error("Configura GOOGLE_MAPS_API_KEY nos Secrets do servidor.");
 if(!data.city?.trim()||!data.country?.trim()||!data.niche?.trim()) throw new Error("Preenche país, cidade e nicho.");
 const query=data.niche+" em "+data.city+(data.region?", "+data.region:"")+", "+data.country;
 const res=await fetch("https://places.googleapis.com/v1/places:searchText",{method:"POST",headers:{"Content-Type":"application/json","X-Goog-Api-Key":key,"X-Goog-FieldMask":"places.id,places.displayName,places.primaryTypeDisplayName,places.formattedAddress,places.nationalPhoneNumber,places.rating,places.userRatingCount,places.websiteUri,places.googleMapsUri,places.regularOpeningHours.weekdayDescriptions,places.location"},body:JSON.stringify({textQuery:query,pageSize:20,languageCode:"pt-PT"})});
 const body=await res.json(); if(!res.ok) throw new Error(body.error?.message||"Erro do Google Places.");
 const places=Array.isArray(body.places)?body.places:[];
 const leads=places.map((p:any)=>({id:p.id,name:p.displayName?.text||"Nome não identificado",category:p.primaryTypeDisplayName?.text||data.niche,address:p.formattedAddress||"Morada não identificada",phone:p.nationalPhoneNumber||"",rating:typeof p.rating==="number"?p.rating:null,reviews:p.userRatingCount||0,website:p.websiteUri||null,mapsUrl:p.googleMapsUri||"https://www.google.com/maps",hours:p.regularOpeningHours?.weekdayDescriptions||[],location:p.location}));
 return {leads:leads.filter((l:any)=>(!data.withoutWebsite||!l.website)&&(!data.phoneOnly||Boolean(l.phone))&&(l.rating||0)>=(data.minRating||0)&&l.reviews>=(data.minReviews||0)),total:leads.length};
});

export const generateWithAI=createServerFn({method:"POST"}).inputValidator((data:AiInput)=>data).handler(async({data})=>{
 const key=env("AI_API_KEY"); if(!key) throw new Error("Configura AI_API_KEY nos Secrets do servidor.");
 const base=env("AI_BASE_URL","https://api.openai.com/v1").replace(/\/$/,"");
 const instructions:Record<AiInput["task"],string>={
 analysis:"Analisa este negócio: identidade comercial, contactos, presença digital, identidade visual inferível, reputação, público-alvo provável, oportunidades e funcionalidades recomendadas para website. Distingue factos de inferências. Usa 'Não identificado' para lacunas. Nunca inventes dados.",
 website:"Cria um prompt extremamente detalhado e pronto a colar no Lovable, Bolt, v0 ou Replit para construir o website deste negócio. Inclui contexto, objetivos, identidade visual, páginas, secções, conteúdo, funcionalidades, SEO, acessibilidade, responsividade, segurança e critérios de aceitação. Só utiliza factos fornecidos e marca o que deve ser confirmado.",
 outreach:"Escreve uma abordagem comercial natural, curta e personalizada para propor a criação de um website. Não pareça spam. Não afirmes que não existe website; usa 'não encontrei um website associado no Google Maps' quando aplicável.",
 translate:"Traduz e adapta a mensagem fornecida para o idioma pedido, preservando intenção, tom e naturalidade. Devolve apenas a mensagem final."
 };
 const res=await fetch(base+"/chat/completions",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+key},body:JSON.stringify({model:env("AI_MODEL","gpt-4o-mini"),temperature:data.task==="website"?0.65:0.45,messages:[{role:"system",content:"És consultor sénior de prospeção comercial e estratégia digital. Responde em português de Portugal, salvo indicação contrária. "+instructions[data.task]},{role:"user",content:JSON.stringify({negocio:data.lead,contexto:data.context,tom:data.tone,canal:data.channel,idioma:data.language},null,2)}]})});
 const body=await res.json(); if(!res.ok) throw new Error(body.error?.message||"Erro do fornecedor de IA.");
 const text=body.choices?.[0]?.message?.content; if(!text) throw new Error("A IA não devolveu texto."); return {text};
});
