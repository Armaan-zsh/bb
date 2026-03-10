"use strict";exports.id=692,exports.ids=[692],exports.modules={1409:(a,b,c)=>{c.r(b),c.d(b,{TECH_STOPWORDS:()=>d,extractKeywords:()=>e,rankKeywords:()=>f});let d=new Set(["the","and","for","with","from","this","that","your","will","have","new","how","why","what","who","where","when","into","over","under","about","after","before","out","off","all","any","each","most","some","such","very","been","were","was","are","can","not","but","can","let","get","use","using","build","building","make","making","developer","engineering","development","release","version","update","announcing","introducing","guide","tutorial","blog","post","feed","news","hacker","news","show","hn","part","best","tool","toolkit","framework","service","system","application","project","server","client","database","data","cloud","security","secure","management","work","working","today","now"]);function e(a){return a.toLowerCase().replace(/[^a-z0-9#+]/g," ").split(/\s+/).filter(a=>a.length>2&&!d.has(a))}function f(a){let b={};return a.forEach(a=>{new Set(e(a)).forEach(a=>{b[a]=(b[a]||0)+1})}),Object.entries(b).sort((a,b)=>b[1]-a[1]).slice(0,10).map(([a])=>a)}},33692:(a,b,c)=>{c.d(b,{Lf:()=>h,K5:()=>i,XK:()=>j,kY:()=>k,aZ:()=>m,purgePosts:()=>l});let d=Symbol.for("__cloudflare-context__");function e(){return globalThis[d]}async function f(){let a=e();if(a)return a;{var b;let a=await g();return b=a,globalThis[d]=b,a}}async function g(a){let{getPlatformProxy:b}=await import(`${"__wrangler".replaceAll("_","")}`),c=a?.environment??process.env.NEXT_DEV_WRANGLER_ENV,{env:d,cf:e,ctx:f}=await b({...a,envFiles:[],environment:c});return{env:d,cf:e,ctx:f}}async function h(){let{env:a}=await function(a={async:!1}){return a.async?f():function(){let a=e();if(a)return a;if(function(){let a=globalThis;return a.__NEXT_DATA__?.nextExport===!0}())throw Error("\n\nERROR: `getCloudflareContext` has been called in sync mode in either a static route or at the top level of a non-static one, both cases are not allowed but can be solved by either:\n  - make sure that the call is not at the top level and that the route is not static\n  - call `getCloudflareContext({async: true})` to use the `async` mode\n  - avoid calling `getCloudflareContext` in the route\n");throw Error('\n\nERROR: `getCloudflareContext` has been called without having called `initOpenNextCloudflareForDev` from the Next.js config file.\nYou should update your Next.js config file as shown below:\n\n   ```\n   // next.config.mjs\n\n   import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";\n\n   initOpenNextCloudflareForDev();\n\n   const nextConfig = { ... };\n   export default nextConfig;\n   ```\n\n')}()}();return a.DB}async function i(a={}){let b,c=await h(),{page:d=1,limit:e=24,category:f,tier:g,q:j,sourceId:k}=a,l=(d-1)*e,{sql:m,params:n}=function(a){let b=[],c=[];return a.category&&"all"!==a.category&&(b.push("s.category = ?"),c.push(a.category)),a.tier&&(b.push("s.tier <= ?"),c.push(a.tier)),a.sourceId&&(b.push("p.source_id = ?"),c.push(a.sourceId)),{sql:b.join(" AND "),params:c}}({category:f,tier:g,sourceId:k}),o=m?"WHERE "+m:"";if(j&&j.trim()){let a="%"+j.trim()+"%",b=await c.prepare(`
      SELECT p.*, s.name as source_name, s.category as source_category, s.tier as source_tier
      FROM posts p
      JOIN sources s ON s.id = p.source_id
      ${o?o+" AND":"WHERE"}
      (p.title LIKE ?1 OR p.excerpt LIKE ?1)
      ORDER BY p.published_at DESC
      LIMIT ?2 OFFSET ?3
    `).bind(...n,a,e,l).all(),d=await c.prepare(`
      SELECT COUNT(*) as count FROM posts p
      JOIN sources s ON s.id = p.source_id
      ${o?o+" AND":"WHERE"}
      (p.title LIKE ?1 OR p.excerpt LIKE ?1)
    `).bind(...n,a).first();return{posts:b.results,total:d?.count??0}}b=!(e<=24)||1!==g||f||j?`
      SELECT p.*, s.name as source_name, s.category as source_category, s.tier as source_tier
      FROM posts p
      JOIN sources s ON s.id = p.source_id
      ${o}
      ORDER BY p.published_at DESC
      LIMIT ? OFFSET ?
    `:`
      WITH RankedPosts AS (
        SELECT p.*, s.name as source_name, s.category as source_category, s.tier as source_tier,
               ROW_NUMBER() OVER (PARTITION BY p.source_id ORDER BY p.published_at DESC) as rank
        FROM posts p
        JOIN sources s ON s.id = p.source_id
        ${o}
      )
      SELECT * FROM RankedPosts
      WHERE rank <= 2
      ORDER BY published_at DESC
      LIMIT ? OFFSET ?
    `;let p=await c.prepare(b).bind(...n,e,l).all(),q=await c.prepare(`
    SELECT COUNT(*) as count FROM posts p
    JOIN sources s ON s.id = p.source_id
    ${o}
  `).bind(...n).first();return{posts:p.results,total:q?.count??0}}async function j(){let a=await h();return(await a.prepare(`
    SELECT s.*, COUNT(p.id) as post_count
    FROM sources s
    LEFT JOIN posts p ON p.source_id = s.id
    WHERE s.active = 1
    GROUP BY s.id
    ORDER BY s.tier ASC, s.name ASC
  `).all()).results}async function k(){let a=await h(),b=await a.prepare("SELECT COUNT(*) as count FROM posts").first(),c=await a.prepare("SELECT COUNT(*) as count FROM sources WHERE active = 1").first(),d=await a.prepare("SELECT MAX(fetched_at) as t FROM posts").first();return{postCount:b?.count??0,sourceCount:c?.count??0,lastFetched:d?.t??null}}async function l(a=30){let b=await h(),c=await b.prepare("DELETE FROM posts WHERE published_at < datetime('now', '-' || ? || ' days')").bind(a).run();return c.meta?.changes??0}async function m(a=8){let b=await h(),d=await b.prepare(`
    SELECT title FROM posts
    WHERE published_at > datetime('now', '-2 days')
  `).all(),{rankKeywords:e}=c(1409);return e(d.results.map(a=>a.title)).slice(0,a)}}};