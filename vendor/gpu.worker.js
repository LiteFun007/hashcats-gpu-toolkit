(function(){function e(e){let t=[e.description,e.device,`${e.vendor??``} ${e.architecture??``}`];for(let e of t){let t=(e??``).trim();if(t)return t}return`GPU`}function t(e){let t=[e.vendor,e.architecture,e.device,e.description].filter(Boolean).join(` `);return/swiftshader|llvmpipe|lavapipe|softpipe|warp|software|microsoft basic/i.test(t)}function n(e){return e?e.isFallbackAdapter===!0||t(e):!1}function r(){if(typeof navigator>`u`)return!1;let e=navigator.userAgentData;if(typeof e?.mobile==`boolean`)return e.mobile;let t=navigator.userAgent||``;return/android|iphone|ipad|ipod|mobile/i.test(t)?!0:/Macintosh/.test(t)&&(navigator.maxTouchPoints??0)>1}let i=new Int32Array([1,0,0,0,1,1,1,1,0,0,1,0,1,1,1,1,0,0,0,0,1,0,1,0]),a=new Int32Array([0,137,-2147483509,-2147450752,139,32768,-2147450744,-2147483518,11,10,32898,32771,32907,-2147483637,-2147483510,-2147483519,-2147483519,-2147483640,131,-2147450877,-2147450744,-2147483512,32768,-2147450750]);function o(e,t){let n=0,r=0;for(let i=0;i<16;i++)n|=(e>>>2*i&1)<<i,r|=(e>>>2*i+1&1)<<i,n|=(t>>>2*i&1)<<i+16,r|=(t>>>2*i+1&1)<<i+16;return[n|0,r|0]}function s(e,t){let n=0,r=0;for(let i=0;i<16;i++)n|=(e>>>i&1)<<2*i,n|=(t>>>i&1)<<2*i+1,r|=(e>>>i+16&1)<<2*i,r|=(t>>>i+16&1)<<2*i+1;return[n|0,r|0]}function ee(e){if(e.length>=136)throw Error(`miner input must fit in a single block`);let t=new Uint8Array(136);t.set(e),t[e.length]=1,t[135]|=128;let n=new Int32Array(34);for(let e=0;e<17;e++){let[r,i]=o(t[8*e]|t[8*e+1]<<8|t[8*e+2]<<16|t[8*e+3]<<24,t[8*e+4]|t[8*e+5]<<8|t[8*e+6]<<16|t[8*e+7]<<24);n[2*e]=r,n[2*e+1]=i}return n}function c(e,t){for(let n=0;n<4;n++){let[r,i]=s(e[2*n],e[2*n+1]);t[8*n]=r&255,t[8*n+1]=r>>>8&255,t[8*n+2]=r>>>16&255,t[8*n+3]=r>>>24&255,t[8*n+4]=i&255,t[8*n+5]=i>>>8&255,t[8*n+6]=i>>>16&255,t[8*n+7]=i>>>24&255}return t}function l(e,t,n){let r=e[0],o=e[1],s=e[2],ee=e[3],c=e[4],l=e[5],te=e[6],u=e[7],d=e[8],f=e[9],ne=e[10],re=e[11],p=e[12],m=e[13],ie=e[14],ae=e[15],h=e[16],g=e[17],_=e[18],v=e[19],oe=e[20],y=e[21],b=e[22],x=e[23],S=e[24],C=e[25],w=e[26],T=e[27],E=e[28],D=e[29],O=e[30],k=e[31],A=e[32],j=e[33],M=0,N=0,P=0,F=0,I=0,L=0,R=0,z=0,B=0,V=0,H=0,se=0,U=0,W=0,G=0,ce=0;p=p&4294901760|t&65535,m=m&4294901760|t>>>16&65535;for(let e=0;e<24;e++){let t=r^ne^oe^O^R,n=o^re^y^k^z,le=s^p^b^A^B,ue=ee^m^x^j^V,K=c^ie^S^M^H,q=l^ae^C^N^se,de=te^h^w^P^U,fe=u^g^T^F^W,pe=d^_^E^I^G,me=f^v^D^L^ce,J=pe^(ue<<1|ue>>>31),Y=me^le,X=t^(q<<1|q>>>31),Z=n^K,Q=le^(fe<<1|fe>>>31),$=ue^de,he=K^(me<<1|me>>>31),ge=q^pe,_e=de^(n<<1|n>>>31),ve=fe^t,ye=r^J,be=o^Y,xe=p^X,Se=m^Z,Ce=xe<<22|xe>>>10,we=Se<<22|Se>>>10,Te=S^Q,Ee=C^$,De=Ee<<22|Ee>>>10,Oe=Te<<21|Te>>>11,ke=P^he,Ae=F^ge,je=Ae<<11|Ae>>>21,Me=ke<<10|ke>>>22,Ne=G^_e,Pe=ce^ve,Fe=Ne<<7|Ne>>>25,Ie=Pe<<7|Pe>>>25,Le=te^he,Re=u^ge,ze=Le<<14|Le>>>18,Be=Re<<14|Re>>>18,Ve=_^_e,He=v^ve,Ue=Ve<<10|Ve>>>22,We=He<<10|He>>>22,Ge=oe^J,Ke=y^Y,qe=Ke<<2|Ke>>>30,Je=Ge<<1|Ge>>>31,Ye=A^X,Xe=j^Z,Ze=Xe<<23|Xe>>>9,Qe=Ye<<22|Ye>>>10,$e=H^Q,et=se^$,tt=et<<31|et>>>1,nt=$e<<30|$e>>>2,rt=s^X,it=ee^Z,at=it<<1|it>>>31,ot=rt,st=ie^Q,ct=ae^$,lt=st<<3|st>>>29,ut=ct<<3|ct>>>29,dt=w^he,ft=T^ge,pt=ft<<13|ft>>>19,mt=dt<<12|dt>>>20,ht=I^_e,gt=L^ve,_t=ht<<4|ht>>>28,vt=gt<<4|gt>>>28,yt=R^J,bt=z^Y,xt=yt<<9|yt>>>23,St=bt<<9|bt>>>23,Ct=d^_e,wt=f^ve,Tt=wt<<14|wt>>>18,Et=Ct<<13|Ct>>>19,Dt=ne^J,Ot=re^Y,kt=Dt<<18|Dt>>>14,At=Ot<<18|Ot>>>14,jt=b^X,Mt=x^Z,Nt=jt<<5|jt>>>27,Pt=Mt<<5|Mt>>>27,Ft=M^Q,It=N^$,Lt=It<<8|It>>>24,Rt=Ft<<7|Ft>>>25,zt=U^he,Bt=W^ge,Vt=zt<<28|zt>>>4,Ht=Bt<<28|Bt>>>4,Ut=c^Q,Wt=l^$,Gt=Ut<<31|Ut>>>1,Kt=Wt<<31|Wt>>>1,qt=h^he,Jt=g^ge,Yt=Jt<<28|Jt>>>4,Xt=qt<<27|qt>>>5,Zt=E^_e,Qt=D^ve,$t=Qt<<20|Qt>>>12,en=Zt<<19|Zt>>>13,tn=O^J,nn=k^Y,rn=nn<<21|nn>>>11,an=tn<<20|tn>>>12,on=B^X,sn=V^Z,cn=on<<1|on>>>31,ln=sn<<1|sn>>>31;r=ye^~Ce&De^i[e],o=be^~we&Oe^a[e],s=Ce^~De&je,ee=we^~Oe&Me,c=De^~je&Fe,l=Oe^~Me&Ie,te=je^~Fe&ye,u=Me^~Ie&be,d=Fe^~ye&Ce,f=Ie^~be&we,ne=ze^~Ue&qe,re=Be^~We&Je,p=Ue^~qe&Ze,m=We^~Je&Qe,ie=qe^~Ze&tt,ae=Je^~Qe&nt,h=Ze^~tt&ze,g=Qe^~nt&Be,_=tt^~ze&Ue,v=nt^~Be&We,oe=at^~lt&pt,y=ot^~ut&mt,b=lt^~pt&_t,x=ut^~mt&vt,S=pt^~_t&xt,C=mt^~vt&St,w=_t^~xt&at,T=vt^~St&ot,E=xt^~at&lt,D=St^~ot&ut,O=Tt^~kt&Nt,k=Et^~At&Pt,A=kt^~Nt&Lt,j=At^~Pt&Rt,M=Nt^~Lt&Vt,N=Pt^~Rt&Ht,P=Lt^~Vt&Tt,F=Rt^~Ht&Et,I=Vt^~Tt&kt,L=Ht^~Et&At,R=Gt^~Yt&$t,z=Kt^~Xt&en,B=Yt^~$t&rn,V=Xt^~en&an,H=$t^~rn&cn,se=en^~an&ln,U=rn^~cn&Gt,W=an^~ln&Kt,G=cn^~Gt&Yt,ce=ln^~Kt&Xt}n[0]=r,n[1]=o,n[2]=s,n[3]=ee,n[4]=c,n[5]=l,n[6]=te,n[7]=u}let te=new Int32Array(25);for(let e=0;e<5;e++)for(let t=0;t<5;t++)te[t+5*e]=e+5*((2*t+3*e)%5);new Int32Array([1,32898,32906,2147516416,32907,2147483649,2147516545,32777,138,136,2147516425,2147483658,2147516555,139,32905,32771,32770,128,32778,2147483658,2147516545,32896,2147483649,2147516424]),new Int32Array([0,0,-2147483648,-2147483648,0,0,-2147483648,-2147483648,0,0,0,0,0,-2147483648,-2147483648,-2147483648,-2147483648,-2147483648,0,-2147483648,-2147483648,-2147483648,0,-2147483648]);let u=new Int32Array(16);for(let e=0;e<16;e++)u[e]=e&1|(e&2)<<1|(e&4)<<2|(e&8)<<3;let d=new Int32Array(256);for(let e=1;e<256;e++){let t=0,n=e;for(;!(n&128);)t++,n<<=1;d[e]=t}d[0]=8;function f(e){let t=0;for(let n of e){if(n===0){t+=8;continue}return t+d[n]}return t}function ne(e,t){for(let n=0;n<32;n++)if(e[n]!==t[n])return e[n]<t[n];return!1}function re(e,t,n){let r=new Uint8Array(116);return h(e,r,0,20),h(t,r,52,32),h(n,r,84,32),r}function p(e,t,n){return ee(re(e,t,n))}function m(e,t){e[10]=e[10]&65535|(t&65535)<<16,e[11]=e[11]&65535|(t>>>16&65535)<<16}function ie(e,t){let n=s(t&65535,t>>>16&65535)[0]>>>0,r=s(e&65535,e>>>16&65535)[0]>>>0;return BigInt(ae(r))<<32n|BigInt(ae(n))}function ae(e){return((e&255)<<24|(e>>>8&255)<<16|(e>>>16&255)<<8|e>>>24)>>>0}function h(e,t,n,r){let i=e.startsWith(`0x`)?e.slice(2):e;if(i.length!==r*2)throw Error(`expected ${r} bytes, got ${i.length/2}`);for(let e=0;e<r;e++)t[n+e]=parseInt(i.slice(e*2,e*2+2),16)}function g(e){let t=`0x`;for(let n of e)t+=n.toString(16).padStart(2,`0`);return t}let _=256,v=1024,oe=r()?12:24,y=null,b=null,x=[],S=!1,C=!1,w=``,T=``,E=``,D=new Int32Array(34),O=new Uint8Array(32),k=256,A=0,j=0,M=0,N=new Int32Array(8),P=new Uint8Array(32),F=new Uint8Array(32).fill(255),I=new Uint8Array(32),L=-1,R=new Float64Array(33),z={hashes:0,ms:0},B={hashes:0,ms:0},V=0,H=64,se=32768,U=`high-performance`;function W(e){if(S=!1,y=null,b=null,x=[],C)return;C=!0;let t={type:`failed`,reason:e};self.postMessage(t)}function G(e){return e instanceof Error?e.message:typeof e==`object`&&e&&`message`in e?String(e.message):String(e)}async function ce(t){if(!navigator.gpu)return W(`This browser does not offer WebGPU to background workers`),!1;let r=null;try{r=await navigator.gpu.requestAdapter({powerPreference:t})}catch(e){return W(G(e)),!1}if(!r)return W(`No GPU available to this browser`),!1;if(n(r.info))return W(`This browser only offers a software renderer, and the cores are faster`),!1;try{y=await r.requestDevice()}catch(e){return W(G(e)),!1}y.lost.then(e=>{e.reason!==`destroyed`&&W(`The GPU went away: ${e.message||e.reason}`)}),y.addEventListener(`uncapturederror`,e=>{W(G(e.error))}),_=Math.max(1,Math.min(256,y.limits.maxComputeInvocationsPerWorkgroup,y.limits.maxComputeWorkgroupSizeX)),se=Math.max(1,Math.min(32768,y.limits.maxComputeWorkgroupsPerDimension)),y.pushErrorScope(`validation`);let i=y.createShaderModule({code:`// Перебор keccak-256 на видеокарте.
//
// Одна нить считает \`perThread\` хэшей подряд. Вход у всех общий и лежит в
// \`job.k\` — 34 слова начального состояния, собранные на процессоре; нить
// подменяет в нём только младшие 16 бит двух слов, и это её счётчик.
//
// ⚠️ ЧТО ВОЗВРАЩАЕТСЯ. Не хэши — их было бы 250 миллионов в секунду. Наружу
// уходят два числа: гистограмма глубин (сколько попыток на каждое число
// ведущих нулей) и список кандидатов — тех редких попыток, что перевалили
// порог. Полный хэш кандидата процессор пересчитывает сам: их единицы, а
// перекладывать 32 байта с каждой попытки стоило бы дороже самого перебора.
//
// ⚠️ ГИСТОГРАММА СЧИТАЕТСЯ В РЕГИСТРАХ. Половина всех попыток имеет ровно
// ноль ведущих нулей, четверть — один: атомарный инкремент на каждую попытку
// сериализовал бы всю группу на одной ячейке. Восемь первых ступеней нить
// копит у себя и отдаёт один раз в конце; атомарно идут только глубины от
// восьми, а они встречаются реже одной попытки из двухсот пятидесяти шести.
//
// Тело раунда собрано \`packer/gen_keccak.py\` — тем же, что пишет \`keccak.ts\`.
// Правь генератор, а не эти строки.

// СОБРАНО packer/gen_keccak.py — начало
const RCE = array<u32, 24>(0x00000001u, 0x00000000u, 0x00000000u, 0x00000000u, 0x00000001u, 0x00000001u, 0x00000001u, 0x00000001u, 0x00000000u, 0x00000000u, 0x00000001u, 0x00000000u, 0x00000001u, 0x00000001u, 0x00000001u, 0x00000001u, 0x00000000u, 0x00000000u, 0x00000000u, 0x00000000u, 0x00000001u, 0x00000000u, 0x00000001u, 0x00000000u);
const RCO = array<u32, 24>(0x00000000u, 0x00000089u, 0x8000008bu, 0x80008080u, 0x0000008bu, 0x00008000u, 0x80008088u, 0x80000082u, 0x0000000bu, 0x0000000au, 0x00008082u, 0x00008003u, 0x0000808bu, 0x8000000bu, 0x8000008au, 0x80000081u, 0x80000081u, 0x80000008u, 0x00000083u, 0x80008003u, 0x80008088u, 0x80000088u, 0x00008000u, 0x80008082u);
// СОБРАНО packer/gen_keccak.py — конец

struct Job {
  /** начальное состояние: 17 слов keccak в интерливе, по два числа на слово */
  k: array<u32, 34>,
  /** с какого счётчика начинает нить с номером ноль */
  base: u32,
  /** сколько хэшей считает одна нить */
  perThread: u32,
  /** с какой глубины попытка попадает в список кандидатов */
  thresh: u32,
  /** сколько кандидатов помещается в буфер */
  maxCands: u32,
};

struct Counters {
  count: atomic<u32>,
  hist: array<atomic<u32>, 33>,
};

@group(0) @binding(0) var<storage, read> job: Job;
@group(0) @binding(1) var<storage, read_write> out: Counters;
@group(0) @binding(2) var<storage, read_write> cands: array<vec2<u32>>;

/**
 * Гистограмма рабочей группы.
 *
 * ⚠️ ГЛОБАЛЬНЫХ АТОМАРНЫХ ОПЕРАЦИЙ ЗДЕСЬ БЫЛО ВОСЕМЬ НА КАЖДУЮ НИТЬ — при
 * четверти миллиарда попыток в секунду это шестьдесят миллионов обращений к
 * памяти карты в секунду, и все в одни и те же тридцать три ячейки. Через
 * общую память группы наружу уходит по одному обращению на ступень на всю
 * группу: замер 257 МХ/с против 254.
 */
var<workgroup> shared_hist: array<atomic<u32>, 33>;

/**
 * Сколько нитей в группе. Значение подставляется при сборке шейдера, а не
 * зашито: на части мобильных видеокарт предел \`maxComputeInvocationsPerWorkgroup\`
 * равен 128 или 64, и объявленные жёстко 256 просто не дали бы собрать
 * конвейер — майнер молча уходил бы на ядра там, где карта вполне годна.
 */
override WG: u32 = 256u;

@compute @workgroup_size(WG)
fn main(@builtin(global_invocation_id) gid: vec3<u32>,
        @builtin(local_invocation_index) lid: u32) {
  // Ступеней тридцать три, а нитей в группе бывает и меньше — обнуляем с
  // шагом в размер группы, иначе на узких группах последние ступени остались
  // бы с мусором от прошлого запуска.
  for (var i = lid; i < 33u; i = i + WG) { atomicStore(&shared_hist[i], 0u); }
  workgroupBarrier();
  // Вход читается из памяти один раз на нить, а не на каждый хэш: 34 чтения
  // внутри цикла стоили десятую часть скорости.
  let k0e = job.k[0]; let k0o = job.k[1];
  let k1e = job.k[2]; let k1o = job.k[3];
  let k2e = job.k[4]; let k2o = job.k[5];
  let k3e = job.k[6]; let k3o = job.k[7];
  let k4e = job.k[8]; let k4o = job.k[9];
  let k5e = job.k[10]; let k5o = job.k[11];
  let k6e = job.k[12]; let k6o = job.k[13];
  let k7e = job.k[14]; let k7o = job.k[15];
  let k8e = job.k[16]; let k8o = job.k[17];
  let k9e = job.k[18]; let k9o = job.k[19];
  let k10e = job.k[20]; let k10o = job.k[21];
  let k11e = job.k[22]; let k11o = job.k[23];
  let k12e = job.k[24]; let k12o = job.k[25];
  let k13e = job.k[26]; let k13o = job.k[27];
  let k14e = job.k[28]; let k14o = job.k[29];
  let k15e = job.k[30]; let k15o = job.k[31];
  let k16e = job.k[32]; let k16o = job.k[33];

  let perThread = job.perThread;
  let thresh = job.thresh;
  let maxCands = job.maxCands;
  let start = job.base + gid.x * perThread;

  var c0 = 0u; var c1 = 0u; var c2 = 0u; var c3 = 0u;
  var c4 = 0u; var c5 = 0u; var c6 = 0u; var c7 = 0u;

  for (var it = 0u; it < perThread; it = it + 1u) {
    let n = start + it;
    var a0e = k0e; var a0o = k0o;
    var a1e = k1e; var a1o = k1o;
    var a2e = k2e; var a2o = k2o;
    var a3e = k3e; var a3o = k3o;
    var a4e = k4e; var a4o = k4o;
    var a5e = k5e; var a5o = k5o;
    var a6e = k6e; var a6o = k6o;
    var a7e = k7e; var a7o = k7o;
    var a8e = k8e; var a8o = k8o;
    var a9e = k9e; var a9o = k9o;
    var a10e = k10e; var a10o = k10o;
    var a11e = k11e; var a11o = k11o;
    var a12e = k12e; var a12o = k12o;
    var a13e = k13e; var a13o = k13o;
    var a14e = k14e; var a14o = k14o;
    var a15e = k15e; var a15o = k15o;
    var a16e = k16e; var a16o = k16o;
    var a17e = 0u; var a17o = 0u;
    var a18e = 0u; var a18o = 0u;
    var a19e = 0u; var a19o = 0u;
    var a20e = 0u; var a20o = 0u;
    var a21e = 0u; var a21o = 0u;
    var a22e = 0u; var a22o = 0u;
    var a23e = 0u; var a23o = 0u;
    var a24e = 0u; var a24o = 0u;

    // Счётчик садится в младшие 16 бит шестого слова — это байты 48..51
    // входа, то есть младшие четыре байта nonce. Ничего интерливить на ходу
    // не надо: половинки счётчика УЖЕ разложены по чётным и нечётным битам,
    // а обратно nonce собирает процессор, когда находка того стоит.
    a6e = (a6e & 0xffff0000u) | (n & 0xffffu);
    a6o = (a6o & 0xffff0000u) | ((n >> 16u) & 0xffffu);

    for (var rnd = 0u; rnd < 24u; rnd = rnd + 1u) {
// СОБРАНО packer/gen_keccak.py — начало
      let c0e = a0e ^ a5e ^ a10e ^ a15e ^ a20e;
      let c0o = a0o ^ a5o ^ a10o ^ a15o ^ a20o;
      let c1e = a1e ^ a6e ^ a11e ^ a16e ^ a21e;
      let c1o = a1o ^ a6o ^ a11o ^ a16o ^ a21o;
      let c2e = a2e ^ a7e ^ a12e ^ a17e ^ a22e;
      let c2o = a2o ^ a7o ^ a12o ^ a17o ^ a22o;
      let c3e = a3e ^ a8e ^ a13e ^ a18e ^ a23e;
      let c3o = a3o ^ a8o ^ a13o ^ a18o ^ a23o;
      let c4e = a4e ^ a9e ^ a14e ^ a19e ^ a24e;
      let c4o = a4o ^ a9o ^ a14o ^ a19o ^ a24o;
      let d0e = c4e ^ ((c1o << 1u) | (c1o >> 31u));
      let d0o = c4o ^ c1e;
      let d1e = c0e ^ ((c2o << 1u) | (c2o >> 31u));
      let d1o = c0o ^ c2e;
      let d2e = c1e ^ ((c3o << 1u) | (c3o >> 31u));
      let d2o = c1o ^ c3e;
      let d3e = c2e ^ ((c4o << 1u) | (c4o >> 31u));
      let d3o = c2o ^ c4e;
      let d4e = c3e ^ ((c0o << 1u) | (c0o >> 31u));
      let d4o = c3o ^ c0e;
      let b0e = a0e ^ d0e;
      let b0o = a0o ^ d0o;
      let t6e = a6e ^ d1e;
      let t6o = a6o ^ d1o;
      let b1e = ((t6e << 22u) | (t6e >> 10u));
      let b1o = ((t6o << 22u) | (t6o >> 10u));
      let t12e = a12e ^ d2e;
      let t12o = a12o ^ d2o;
      let b2e = ((t12o << 22u) | (t12o >> 10u));
      let b2o = ((t12e << 21u) | (t12e >> 11u));
      let t18e = a18e ^ d3e;
      let t18o = a18o ^ d3o;
      let b3e = ((t18o << 11u) | (t18o >> 21u));
      let b3o = ((t18e << 10u) | (t18e >> 22u));
      let t24e = a24e ^ d4e;
      let t24o = a24o ^ d4o;
      let b4e = ((t24e << 7u) | (t24e >> 25u));
      let b4o = ((t24o << 7u) | (t24o >> 25u));
      let t3e = a3e ^ d3e;
      let t3o = a3o ^ d3o;
      let b5e = ((t3e << 14u) | (t3e >> 18u));
      let b5o = ((t3o << 14u) | (t3o >> 18u));
      let t9e = a9e ^ d4e;
      let t9o = a9o ^ d4o;
      let b6e = ((t9e << 10u) | (t9e >> 22u));
      let b6o = ((t9o << 10u) | (t9o >> 22u));
      let t10e = a10e ^ d0e;
      let t10o = a10o ^ d0o;
      let b7e = ((t10o << 2u) | (t10o >> 30u));
      let b7o = ((t10e << 1u) | (t10e >> 31u));
      let t16e = a16e ^ d1e;
      let t16o = a16o ^ d1o;
      let b8e = ((t16o << 23u) | (t16o >> 9u));
      let b8o = ((t16e << 22u) | (t16e >> 10u));
      let t22e = a22e ^ d2e;
      let t22o = a22o ^ d2o;
      let b9e = ((t22o << 31u) | (t22o >> 1u));
      let b9o = ((t22e << 30u) | (t22e >> 2u));
      let t1e = a1e ^ d1e;
      let t1o = a1o ^ d1o;
      let b10e = ((t1o << 1u) | (t1o >> 31u));
      let b10o = t1e;
      let t7e = a7e ^ d2e;
      let t7o = a7o ^ d2o;
      let b11e = ((t7e << 3u) | (t7e >> 29u));
      let b11o = ((t7o << 3u) | (t7o >> 29u));
      let t13e = a13e ^ d3e;
      let t13o = a13o ^ d3o;
      let b12e = ((t13o << 13u) | (t13o >> 19u));
      let b12o = ((t13e << 12u) | (t13e >> 20u));
      let t19e = a19e ^ d4e;
      let t19o = a19o ^ d4o;
      let b13e = ((t19e << 4u) | (t19e >> 28u));
      let b13o = ((t19o << 4u) | (t19o >> 28u));
      let t20e = a20e ^ d0e;
      let t20o = a20o ^ d0o;
      let b14e = ((t20e << 9u) | (t20e >> 23u));
      let b14o = ((t20o << 9u) | (t20o >> 23u));
      let t4e = a4e ^ d4e;
      let t4o = a4o ^ d4o;
      let b15e = ((t4o << 14u) | (t4o >> 18u));
      let b15o = ((t4e << 13u) | (t4e >> 19u));
      let t5e = a5e ^ d0e;
      let t5o = a5o ^ d0o;
      let b16e = ((t5e << 18u) | (t5e >> 14u));
      let b16o = ((t5o << 18u) | (t5o >> 14u));
      let t11e = a11e ^ d1e;
      let t11o = a11o ^ d1o;
      let b17e = ((t11e << 5u) | (t11e >> 27u));
      let b17o = ((t11o << 5u) | (t11o >> 27u));
      let t17e = a17e ^ d2e;
      let t17o = a17o ^ d2o;
      let b18e = ((t17o << 8u) | (t17o >> 24u));
      let b18o = ((t17e << 7u) | (t17e >> 25u));
      let t23e = a23e ^ d3e;
      let t23o = a23o ^ d3o;
      let b19e = ((t23e << 28u) | (t23e >> 4u));
      let b19o = ((t23o << 28u) | (t23o >> 4u));
      let t2e = a2e ^ d2e;
      let t2o = a2o ^ d2o;
      let b20e = ((t2e << 31u) | (t2e >> 1u));
      let b20o = ((t2o << 31u) | (t2o >> 1u));
      let t8e = a8e ^ d3e;
      let t8o = a8o ^ d3o;
      let b21e = ((t8o << 28u) | (t8o >> 4u));
      let b21o = ((t8e << 27u) | (t8e >> 5u));
      let t14e = a14e ^ d4e;
      let t14o = a14o ^ d4o;
      let b22e = ((t14o << 20u) | (t14o >> 12u));
      let b22o = ((t14e << 19u) | (t14e >> 13u));
      let t15e = a15e ^ d0e;
      let t15o = a15o ^ d0o;
      let b23e = ((t15o << 21u) | (t15o >> 11u));
      let b23o = ((t15e << 20u) | (t15e >> 12u));
      let t21e = a21e ^ d1e;
      let t21o = a21o ^ d1o;
      let b24e = ((t21e << 1u) | (t21e >> 31u));
      let b24o = ((t21o << 1u) | (t21o >> 31u));
      a0e = b0e ^ (~b1e & b2e) ^ RCE[rnd];
      a0o = b0o ^ (~b1o & b2o) ^ RCO[rnd];
      a1e = b1e ^ (~b2e & b3e);
      a1o = b1o ^ (~b2o & b3o);
      a2e = b2e ^ (~b3e & b4e);
      a2o = b2o ^ (~b3o & b4o);
      a3e = b3e ^ (~b4e & b0e);
      a3o = b3o ^ (~b4o & b0o);
      a4e = b4e ^ (~b0e & b1e);
      a4o = b4o ^ (~b0o & b1o);
      a5e = b5e ^ (~b6e & b7e);
      a5o = b5o ^ (~b6o & b7o);
      a6e = b6e ^ (~b7e & b8e);
      a6o = b6o ^ (~b7o & b8o);
      a7e = b7e ^ (~b8e & b9e);
      a7o = b7o ^ (~b8o & b9o);
      a8e = b8e ^ (~b9e & b5e);
      a8o = b8o ^ (~b9o & b5o);
      a9e = b9e ^ (~b5e & b6e);
      a9o = b9o ^ (~b5o & b6o);
      a10e = b10e ^ (~b11e & b12e);
      a10o = b10o ^ (~b11o & b12o);
      a11e = b11e ^ (~b12e & b13e);
      a11o = b11o ^ (~b12o & b13o);
      a12e = b12e ^ (~b13e & b14e);
      a12o = b12o ^ (~b13o & b14o);
      a13e = b13e ^ (~b14e & b10e);
      a13o = b13o ^ (~b14o & b10o);
      a14e = b14e ^ (~b10e & b11e);
      a14o = b14o ^ (~b10o & b11o);
      a15e = b15e ^ (~b16e & b17e);
      a15o = b15o ^ (~b16o & b17o);
      a16e = b16e ^ (~b17e & b18e);
      a16o = b16o ^ (~b17o & b18o);
      a17e = b17e ^ (~b18e & b19e);
      a17o = b17o ^ (~b18o & b19o);
      a18e = b18e ^ (~b19e & b15e);
      a18o = b18o ^ (~b19o & b15o);
      a19e = b19e ^ (~b15e & b16e);
      a19o = b19o ^ (~b15o & b16o);
      a20e = b20e ^ (~b21e & b22e);
      a20o = b20o ^ (~b21o & b22o);
      a21e = b21e ^ (~b22e & b23e);
      a21o = b21o ^ (~b22o & b23o);
      a22e = b22e ^ (~b23e & b24e);
      a22o = b22o ^ (~b23o & b24o);
      a23e = b23e ^ (~b24e & b20e);
      a23o = b23o ^ (~b24o & b20o);
      a24e = b24e ^ (~b20e & b21e);
      a24o = b24o ^ (~b20o & b21o);
// СОБРАНО packer/gen_keccak.py — конец
    }

    // Нулевой байт хэша — это младшие восемь бит нулевого слова, то есть
    // четыре младших бита \`e\` и \`o\` вперемешку.
    let se = (a0e & 1u) | ((a0e & 2u) << 1u) | ((a0e & 4u) << 2u) | ((a0e & 8u) << 3u);
    let so = (a0o & 1u) | ((a0o & 2u) << 1u) | ((a0o & 4u) << 2u) | ((a0o & 8u) << 3u);
    let byte0 = se | (so << 1u);
    var depth: u32;
    if (byte0 != 0u) {
      depth = countLeadingZeros(byte0) - 24u;
    } else {
      depth = deepZeros(a0e, a0o);
    }

    switch depth {
      case 0u: { c0 = c0 + 1u; }
      case 1u: { c1 = c1 + 1u; }
      case 2u: { c2 = c2 + 1u; }
      case 3u: { c3 = c3 + 1u; }
      case 4u: { c4 = c4 + 1u; }
      case 5u: { c5 = c5 + 1u; }
      case 6u: { c6 = c6 + 1u; }
      case 7u: { c7 = c7 + 1u; }
      default: { atomicAdd(&shared_hist[min(depth, 32u)], 1u); }
    }

    if (depth >= thresh) {
      let slot = atomicAdd(&out.count, 1u);
      if (slot < maxCands) { cands[slot] = vec2<u32>(n, depth); }
    }
  }

  // Нулевые ступени не трогаем: у половины нитей глубже пятой не набирается
  // ни одной попытки.
  if (c0 != 0u) { atomicAdd(&shared_hist[0], c0); }
  if (c1 != 0u) { atomicAdd(&shared_hist[1], c1); }
  if (c2 != 0u) { atomicAdd(&shared_hist[2], c2); }
  if (c3 != 0u) { atomicAdd(&shared_hist[3], c3); }
  if (c4 != 0u) { atomicAdd(&shared_hist[4], c4); }
  if (c5 != 0u) { atomicAdd(&shared_hist[5], c5); }
  if (c6 != 0u) { atomicAdd(&shared_hist[6], c6); }
  if (c7 != 0u) { atomicAdd(&shared_hist[7], c7); }

  workgroupBarrier();
  for (var i = lid; i < 33u; i = i + WG) {
    let sum = atomicLoad(&shared_hist[i]);
    if (sum != 0u) { atomicAdd(&out.hist[i], sum); }
  }
}

/// Глубина дальше первого байта. Сюда попадает одна попытка из 256, поэтому
/// считать можно спокойно, байт за байтом, деинтерливя по четыре бита.
///
/// ⚠️ СЧИТАЕМ ВСЕ ВОСЕМЬ БАЙТ НУЛЕВОЙ ДОРОЖКИ, А НЕ ЧЕТЫРЕ. Прошлая редакция
/// упиралась в 32 и отдавала 32 на всё, что глубже, — а процессор, пересчитав
/// такую попытку, получал честные 37 и объявлял карту врущей. Живой случай:
/// при четверти миллиарда попыток в секунду хэш с 33 нулями появляется за
/// несколько секунд, и майнер выключал совершенно исправную карту.
fn deepZeros(e: u32, o: u32) -> u32 {
  var bits = 8u;
  for (var byte = 1u; byte < 8u; byte = byte + 1u) {
    let sh = byte * 4u;
    let pe = (e >> sh) & 15u;
    let po = (o >> sh) & 15u;
    let se = (pe & 1u) | ((pe & 2u) << 1u) | ((pe & 4u) << 2u) | ((pe & 8u) << 3u);
    let so = (po & 1u) | ((po & 2u) << 1u) | ((po & 4u) << 2u) | ((po & 8u) << 3u);
    let b = se | (so << 1u);
    if (b != 0u) { return bits + countLeadingZeros(b) - 24u; }
    bits = bits + 8u;
  }
  // Дальше нулевой дорожки не заглянуть: остальные три не считались. Шестьдесят
  // четыре нуля подряд не выпадали ни в одной сети мира, и вызывающая сторона
  // знает, что это насыщение, а не измерение.
  return 64u;
}
`});try{b=await y.createComputePipelineAsync({layout:`auto`,compute:{module:i,entryPoint:`main`,constants:{WG:_}}})}catch(e){return y.popErrorScope(),W(G(e)),!1}let a=await y.popErrorScope();if(a)return W(G(a)),!1;x=[le(),le()];let o={type:`ready`,device:r.info?e(r.info):`GPU`};return self.postMessage(o),!0}function le(){let e=y,t=e.createBuffer({size:152,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST}),n=e.createBuffer({size:136,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_SRC|GPUBufferUsage.COPY_DST}),r=e.createBuffer({size:v*8,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_SRC});return{job:t,out:n,cands:r,readOut:e.createBuffer({size:136,usage:GPUBufferUsage.MAP_READ|GPUBufferUsage.COPY_DST}),readCands:e.createBuffer({size:v*8,usage:GPUBufferUsage.MAP_READ|GPUBufferUsage.COPY_DST}),bind:e.createBindGroup({layout:b.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:t}},{binding:1,resource:{buffer:n}},{binding:2,resource:{buffer:r}}]}),hashes:0,shot:null,pending:null}}let ue=new Uint32Array(34),K=new Uint32Array(38);function q(e,t,n,r){let i=y;K.set(D,0),K[34]=j>>>0,K[35]=n,K[36]=r,K[37]=v,i.queue.writeBuffer(e.job,0,K),i.queue.writeBuffer(e.out,0,ue);let a=i.createCommandEncoder(),o=a.beginComputePass();o.setPipeline(b),o.setBindGroup(0,e.bind),o.dispatchWorkgroups(t),o.end(),a.copyBufferToBuffer(e.out,0,e.readOut,0,136),a.copyBufferToBuffer(e.cands,0,e.readCands,0,v*8),i.queue.submit([a.finish()]),e.hashes=t*_*n,e.shot={k:D.slice(),prev:E,anchor:T,stream:A,target:O,needDepth:k,base:j},j=j+e.hashes|0,M+=e.hashes,e.pending=(async()=>{await e.readOut.mapAsync(GPUMapMode.READ);let t=new Uint32Array(e.readOut.getMappedRange().slice(0));e.readOut.unmap(),await e.readCands.mapAsync(GPUMapMode.READ);let n=new Uint32Array(e.readCands.getMappedRange().slice(0));return e.readCands.unmap(),{count:t[0],hist:t.subarray(1),cands:n}})()}function de(e){let t=Math.max(8,Math.ceil(Math.log2(Math.max(e,2)/64)));return Math.min(k,t)}function fe(e,t){let n=v/4*2**Math.min(t,30),r=Math.floor(n/(_*32));return Math.max(1,Math.min(e,r))}function pe(e,t){for(let e=0;e<33;e++)R[e]+=t.hist[e];let n=Math.min(t.count,v);for(let r=0;r<n;r++){let n=t.cands[2*r]|0,i=t.cands[2*r+1];l(e.k,n,N),c(N,P);let a=f(P);if(a!==i&&i<64)return W(`The GPU miscounted a hash (said ${i} bits, it is ${a}) — using cores instead`),!1;if(a>L&&(F.set(P),L=a),a>=e.needDepth&&ne(P,e.target)){I.set(P),X();let t={type:`solution`,nonce:ie(e.stream,n).toString(),hash:g(I),prev:e.prev,anchor:e.anchor,depth:a};return self.postMessage(t),S=!1,!1}}return!0}async function me(){let e=x[0],t={counter:j,spent:M};j=12345;let n=Math.max(1,Math.floor(v/_));q(e,1,n,0);let r=e.shot,i=await e.pending;e.pending=null;let a=_*n,o=i.hist.reduce((e,t)=>e+t,0);if(i.count!==a||o!==a)return W(`GPU self-check failed: ${i.count} hashes reported, ${a} expected`),!1;for(let e=0;e<a;e++){let t=i.cands[2*e]|0;l(r.k,t,N),c(N,P);let n=i.cands[2*e+1];if(f(P)!==n&&n<64)return W(`GPU self-check failed: the card and the CPU disagree on a hash`),!1}return j=t.counter,M=t.spent,R.fill(0),!0}function J(e,t){if(B.hashes+=t,B.ms+=e,B.ms<500)return;let n=B.hashes/B.ms*1e3;V=V===0?n:V*.6+n*.4,B.hashes=0,B.ms=0;let r=Math.round(oe/1e3*V/(_*32)),i=Math.max(Math.floor(H/2),Math.min(H*2,r));H=Math.max(4,Math.min(se,i))}function Y(){A=Math.random()*4294967296|0,m(D,A),j=0,M=0}function X(){let e={type:`progress`,hashes:z.hashes,ms:z.ms,best:g(F),bestDepth:Math.max(L,0),depths:Array.from(R)};self.postMessage(e),R.fill(0),z.hashes=0,z.ms=0,F.fill(255),L=-1}function Z(e){let t=de(H*_*32);q(e,fe(H,t),32,t)}async function Q(){let e=performance.now();for(let e of x){if(!S)break;Z(e)}let t=0;for(;S;){let n=x[t%x.length];t++;let r=n.pending,i=n.shot;if(!r||!i)break;let a=await r;if(n.pending=null,!S)break;let o=performance.now(),s=o-e;if(e=o,a.count>v){M-=n.hashes,j=i.base,H=Math.max(1,H>>2),Z(n);continue}if(z.hashes+=n.hashes,z.ms+=s,!pe(i,a))return;z.ms>=250&&X(),M>=4294967296&&Y(),J(s,n.hashes),Z(n)}}self.onmessage=e=>{let t=e.data;if(t.type===`start`){if(C||(w=t.miner,T=t.anchor,E=t.prev,O=t.target,k=f(O),A=t.stream,U=t.power??`high-performance`,D=p(w,E,T),m(D,A),j=Math.random()*4294967296|0,M=0,F.fill(255),L=-1,R.fill(0),z.hashes=0,z.ms=0,B.hashes=0,B.ms=0,S))return;(async()=>{try{if(!y&&!await ce(U)||(S=!0,!await me()))return;await Q()}catch(e){W(G(e))}})();return}if(t.type===`update`){T=t.anchor,E=t.prev,O=t.target,k=f(O),D=p(w,E,T),m(D,A);return}S=!1}})();