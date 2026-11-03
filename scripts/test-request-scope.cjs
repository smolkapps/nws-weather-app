'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const proposal={"sites":[{"site":"nws-weather-app","wrapper":"public/website-pageviews.js","sdk":"public/umami-pageview-sdk.js","hosts":{"nws-weather-app.apps.smolkin.org":"/"},"pages":{"":"PlainWeather","index.html":"PlainWeather","privacy.html":"PlainWeather website privacy"},"instrumented_heads":["index.html","public/privacy.html"]}]};
function fixture(site,host,route,options={}) {
  const root=path.resolve(__dirname,'..'),code=fs.readFileSync(path.join(root,site.wrapper),'utf8');
  const sdk=fs.readFileSync(path.join(root,site.sdk),'utf8');
  const scripts=[],requests=[],listeners=[];let storageWrites=0;
  const document={title:'PRIVATE_PASTED_TEXT',referrer:'https://private.invalid/?secret=REFERRER_SECRET',readyState:'complete',
    querySelectorAll(){throw Error('Must neither inspect nor change page-wide policy')},
    createElement(){return{attrs:{},setAttribute(n,v){this.attrs[n]=v},getAttribute(n){return this.attrs[n]??null}}},
    addEventListener(...a){listeners.push(a)},head:{appendChild(s){scripts.push(s)}}};
  const location={protocol:'https:',hostname:host,pathname:route,origin:'https://'+host,href:'https://'+host+route+'?SECRET_QUERY#SECRET_HASH'};
  const history={pushState(){},replaceState(){}};
  const fetch=async(url,opts)=>{requests.push({url,opts});return{json:async()=>({cache:'SECRET_SERVER_VALUE'})}};
  const c={URL,Promise,console,document,location,history,fetch,
    navigator:{language:'PRIVATE_LANGUAGE',doNotTrack:options.dnt||'',globalPrivacyControl:options.gpc||false},screen:{width:1365,height:900},
    localStorage:{getItem(){return options.disabled?'1':null},setItem(){storageWrites++}},setTimeout(){throw Error('Unexpected timer')}};
  c.window=c;c.top=c;vm.createContext(c);vm.runInContext(code,c);
  return {c,scripts,requests,listeners,fetch,get storageWrites(){return storageWrites},sdk,
    async start(){if(!scripts.length)return;document.currentScript=scripts[0];vm.runInContext(sdk,c);scripts[0].onload();await new Promise(r=>setImmediate(r));}};
}
let routes=0;
for(const site of proposal.sites){
  test(site.site+': every existing host/page uses fixed data and request-local referrer suppression',async()=>{
    for(const [host,prefix] of Object.entries(site.hosts)) for(const [key,title] of Object.entries(site.pages)){
      routes++;const h=fixture(site,host,prefix+key);await h.start();assert.equal(h.requests.length,1);
      const {url,opts}=h.requests[0];assert.equal(url,'https://umami.smolkin.org/api/send');
      assert.equal(opts.referrerPolicy,'no-referrer');assert.equal(opts.credentials,'omit');
      assert.deepEqual(JSON.parse(opts.body),{type:'event',payload:{website:'0ee0e19b-b29b-4c98-b3f6-a92a43b4ba5a',hostname:host,
        url:'https://'+host+prefix+(key==='index.html'?'':key),title,referrer:''}});
      assert.doesNotMatch(opts.body,/SECRET|PRIVATE/);
      assert.equal(h.scripts[0].src,prefix+'umami-pageview-sdk.js');
      assert.equal(h.scripts[0].referrerPolicy,'no-referrer');
      assert.equal(h.scripts[0].integrity,'sha384-'+crypto.createHash('sha384').update(h.sdk).digest('base64'));
      for(const n of ['auto-track','auto-pageview','performance'])assert.equal(h.scripts[0].attrs['data-'+n],'false');
      assert.equal(h.listeners.length,0);assert.equal(h.storageWrites,0);
      await h.c.umami.track('click',{text:'PRIVATE'});await h.c.umami.identify('PERSON');assert.equal(h.requests.length,1);
      assert.equal(h.c.fetch,h.fetch);const options={method:'POST',body:'app-specific synthetic input'};
      await h.c.fetch('https://app.invalid/endpoint',options);assert.deepEqual(h.requests[1].opts,options);
    }
  });
  test(site.site+': excluded identity/routes and privacy opt-outs remain closed',async()=>{
    const [host,prefix]=Object.entries(site.hosts)[0];
    for(const [h,r,o] of [['foreign.invalid',prefix,{}],[host,prefix+'PRIVATE_UNKNOWN',{}],
      [host,prefix,{dnt:'1'}],[host,prefix,{gpc:true}],[host,prefix,{disabled:true}]]){
      const f=fixture(site,h,r,o);await f.start();assert.equal(f.scripts.length,0);assert.equal(f.requests.length,0);
    }
  });
  test(site.site+': heads do not change page-wide referral policy and scope wrapper GET',()=>{
    for(const rel of site.instrumented_heads){
      const after=fs.readFileSync(path.join(__dirname,'..',rel),'utf8');
      assert.doesNotMatch(after,/<meta name="referrer"/);
      assert.match(after,/<script referrerpolicy="no-referrer"[^>]+data-website-id="0ee0e19b-b29b-4c98-b3f6-a92a43b4ba5a"/);
    }
  });
}
test('local SDK use the exact independently reviewed single-option local SDK',()=>{
  for(const site of proposal.sites){
    const raw=fs.readFileSync(path.join(__dirname,'..',site.sdk));
    assert.equal(crypto.createHash('sha256').update(raw).digest('hex'),'04af9d95b0c6a3a923fdfa6f2232c7f999c6474329857ac67831ea0fd091771a');
  }
});
test.after(()=>console.log('Exact host/page request cases:',routes));
