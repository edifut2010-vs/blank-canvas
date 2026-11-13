import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Outlet, Link, createRootRouteWithContext, useRouter, HeadContent, Scripts, type ErrorComponentProps } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
function NotFoundComponent(){return <div className="flex min-h-screen items-center justify-center bg-background"><div className="text-center"><h1 className="text-7xl font-bold">404</h1><p>Página não encontrada</p><Link to="/">Voltar ao início</Link></div></div>}
function ErrorComponent({error,reset}:ErrorComponentProps){console.error(error);const router=useRouter();useEffect(()=>{reportLovableError(error,{boundary:"root"})},[error]);return <div className="flex min-h-screen items-center justify-center"><div className="text-center"><h1>A aplicação encontrou um erro</h1><button onClick={()=>{router.invalidate();reset()}}>Tentar novamente</button></div></div>}
export const Route=createRootRouteWithContext<{queryClient:QueryClient}>()({head:()=>({meta:[{charSet:"utf-8"},{name:"viewport",content:"width=device-width, initial-scale=1"},{title:"LeadFinder AI — Inteligência Comercial"},{name:"description",content:"Plataforma privada de prospeção comercial com inteligência artificial."},{name:"theme-color",content:"#09090b"}],links:[{rel:"stylesheet",href:appCss}]}),shellComponent:RootShell,component:RootComponent,notFoundComponent:NotFoundComponent,errorComponent:ErrorComponent});
function RootShell({children}:{children:ReactNode}){return <html lang="pt-PT"><head><HeadContent/></head><body>{children}<Scripts/></body></html>}
function RootComponent(){const {queryClient}=Route.useRouteContext();return <QueryClientProvider client={queryClient}><Outlet/></QueryClientProvider>}
