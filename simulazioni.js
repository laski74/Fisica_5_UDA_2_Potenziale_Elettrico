
'use strict';

(() => {
  const k = 8.99e9;
  const epsilon = 8.85e-12;
  const format = (n, digits = 3) => new Intl.NumberFormat('it-IT', {maximumSignificantDigits: digits}).format(Math.abs(n) < 1e-10 ? 0 : n);
  const choose = (form, name) => form.elements.namedItem(name).value;
  const val = (form, name) => Number(choose(form, name));
  const grid = () => [70,120,170,220,270,320,370,420,470,520,570,620].map(x=>'<path class="gridline" d="M'+x+' 40V260"/>').join('')
    + [60,100,140,180,220,260].map(y=>'<path class="gridline" d="M35 '+y+'H645"/>').join('');
  const text = (x,y,s,cls='') => '<text x="'+x+'" y="'+y+'" class="'+cls+'">'+s+'</text>';
  const marker = (id, color='teal') => '<defs><marker id="'+id+'" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0 0L6 3 0 6Z" fill="var(--'+color+')"/></marker></defs>';
  const line = (x1,y1,x2,y2,cls='flow',end='') => '<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" class="'+cls+'"'+(end?' marker-end="url(#'+end+')"':'')+'/>';
  const charge = (x,y,q,r=16) => '<circle cx="'+x+'" cy="'+y+'" r="'+r+'" class="'+(q>0?'positive':'negative')+'"/><text x="'+x+'" y="'+(y+1)+'" text-anchor="middle" dominant-baseline="central" class="on-charge">'+(q>0?'+':'−')+'</text>';
  const scale = 180;
  const origin = {x:330,y:155};
  const point = (x,y) => [origin.x + scale*x, origin.y - scale*y];
  const sources = {
    one:[{x:0,y:0,q:4}],
    equal:[{x:-.42,y:0,q:4},{x:.42,y:0,q:4}],
    dipole:[{x:-.42,y:0,q:4},{x:.42,y:0,q:-4}],
    mix:[{x:0,y:0,q:4},{x:1.18,y:.12,q:-4}],
    outside:[{x:1.18,y:.12,q:-4}]
  };
  function sample(x,y,charges) {
    let ex=0,ey=0,v=0;
    for (const source of charges) {
      const dx=x-source.x,dy=y-source.y,r=Math.hypot(dx,dy);
      if(r<.025) return null;
      const a=k*source.q*1e-9;
      ex+=a*dx/r**3; ey+=a*dy/r**3; v+=a/r;
    }
    return {ex,ey,v,m:Math.hypot(ex,ey)};
  }
  function drawCharges(charges) {
    return charges.map(({x,y,q})=>{
      const [px,py]=point(x,y);
      return charge(px,py,q)+text(px-20,py+34,(q>0?'+':'−')+Math.abs(q)+' nC','small');
    }).join('');
  }
  function probe(x,y,value,id) {
    const [px,py]=point(x,y);
    const len=value && value.m ? Math.min(67,28+11*Math.log10(1+value.m)) : 0;
    const arrow=len?line(px,py,px+len*value.ex/value.m,py-len*value.ey/value.m,'resultant',id):'';
    return arrow+'<circle cx="'+px+'" cy="'+py+'" r="5" fill="var(--ink)"/>'+text(px+9,py-8,'P');
  }
  function trace(source,angle,charges) {
    const sign=Math.sign(source.q);
    let x=source.x+.09*Math.cos(angle), y=source.y+.09*Math.sin(angle);
    const path=[];
    for(let i=0;i<240;i++){
      if(Math.abs(x)>1.72||Math.abs(y)>.68) break;
      const field=sample(x,y,charges);
      if(!field||field.m<1||charges.some(other=>other!==source && Math.hypot(x-other.x,y-other.y)<.085))break;
      path.push(point(x,y));
      const dx=sign*.02*field.ex/field.m,dy=sign*.02*field.ey/field.m;
      const mid=sample(x+dx/2,y+dy/2,charges);
      if(!mid||mid.m<1)break;
      x+=sign*.02*mid.ex/mid.m;y+=sign*.02*mid.ey/mid.m;
    }
    if(path.length<3) return '';
    const i=Math.min(19,Math.floor(path.length/2));
    const from=sign>0?path[i-1]:path[i+1],to=path[i];
    const points=path.map(([px,py])=>px.toFixed(1)+','+py.toFixed(1)).join(' ');
    return '<polyline points="'+points+'" class="flow"/>'+line(...from,...to,'flow','field-dir');
  }
  function contours(charges,level) {
    const result=[];
    const dx=.045,dy=.045;
    for(let ix=0;ix<72;ix++) for(let iy=0;iy<30;iy++){
      const x=-1.62+ix*dx,y=-.675+iy*dy;
      const corners=[[x,y],[x+dx,y],[x+dx,y+dy],[x,y+dy]];
      const values=corners.map(([u,v])=>sample(u,v,charges)?.v);
      if(values.includes(undefined))continue;
      const hits=[];
      for(let j=0;j<4;j++){
        const h=(j+1)%4;
        if((values[j]<level)===(values[h]<level))continue;
        const weight=(level-values[j])/(values[h]-values[j]);
        hits.push(point(corners[j][0]+weight*(corners[h][0]-corners[j][0]),corners[j][1]+weight*(corners[h][1]-corners[j][1])));
      }
      if(hits.length===2)result.push('M'+hits[0].join(',')+'L'+hits[1].join(','));
      if(hits.length===4){
        const center=sample(x+dx/2,y+dy/2,charges);
        const pair=((center?.v??level)<level)===(values[0]<level)?[0,1,2,3]:[0,3,1,2];
        for(let j=0;j<4;j+=2)result.push('M'+hits[pair[j]].join(',')+'L'+hits[pair[j+1]].join(','));
      }
    }
    const color=level===0?'sub':level<0?'minus':'plus';
    return '<path d="'+result.join('')+'" fill="none" stroke="var(--'+color+')" stroke-width="'+(level===0?3:2)+'" '+(level<0?'stroke-dasharray="5 2"':'')+'/>';
  }
  const models = {
    lavoro(form) {
      const q=val(form,'q'), dx=val(form,'dx'), dy=.3, field=300;
      const bx=130+dx*850;
      const straight=choose(form,'via')==='diretto';
      const path=straight?'M130 195L'+bx+' 111':'M130 195H'+bx+'V111';
      const dV=-field*dx, work=q*1e-6*field*dx;
      const arrows=[100,150,245].map(y=>line(58,y,621,y,'flow','work-dir')).join('');
      const courier='<g transform="translate(78 160)"><circle cx="0" cy="26" r="11" fill="none" stroke="var(--ink)" stroke-width="3"/><circle cx="33" cy="26" r="11" fill="none" stroke="var(--ink)" stroke-width="3"/><path d="M0 26L11 8 22 26Z M14 10L33 26" fill="none" stroke="var(--accent)" stroke-width="3"/><rect x="0" y="-7" width="19" height="16" rx="3" fill="var(--amber)"/><circle cx="23" cy="-10" r="6" fill="var(--ink)"/></g>';
      const pause=straight?'Sul segmento inclinato conta la proiezione orizzontale.':'Tratto orizzontale '+format(work*1000)+' mJ, tratto verticale 0 mJ.';
      return {
        drawing:marker('work-dir')+grid()+arrows+text(48,52,'E = 300 N/C →')+courier+
          '<path d="'+path+'" class="pathline"/>'+charge(130,195,q,14)+
          '<circle cx="'+bx+'" cy="111" r="6" fill="var(--ink)"/>'+text(111,225,'A')+text(bx+12,109,'B')+
          text(40,284,'Δx = '+format(dx)+' m · Δy = '+format(dy)+' m'),
        result:'q = '+format(q)+' μC · W = '+format(work*1000)+' mJ · ΔU = '+format(-work*1000)+' mJ · ΔV = '+format(dV)+' V. '+pause
      };
    },
    campo(form) {
      const mode=choose(form,'sorgenti'), charges=sources[mode], radius=val(form,'r'), x=val(form,'x'), y=.2;
      const field=sample(x,y,charges);
      const boundary=charges.some(s=>Math.abs(Math.hypot(s.x,s.y)-radius)<.012);
      const qin=charges.filter(s=>Math.hypot(s.x,s.y)<radius).reduce((sum,s)=>sum+s.q,0);
      const positive=charges.filter(s=>s.q>0);
      const from=positive.length?positive:charges;
      const curves=from.map(s=>Array.from({length:12},(_,i)=>trace(s,(i+.25)*Math.PI/6,charges)).join('')).join('');
      return {
        drawing:marker('field-dir')+marker('field-probe','plus')+grid()+
          '<circle cx="330" cy="155" r="'+radius*scale+'" fill="none" stroke="var(--amber)" stroke-width="3" stroke-dasharray="8 6"/>'+
          curves+drawCharges(charges)+probe(x,y,field,'field-probe'),
        result:'E(P) = '+format(field?.m??0)+' N/C. '+(boundary?'Una sorgente è sul bordo o molto vicina. Sposta la superficie prima di confrontare i flussi.':'Q interna = '+format(qin)+' nC · flusso netto uscente = '+format(qin*1e-9/epsilon)+' N·m²/C.')
      };
    },
    coppie(form) {
      const q3=val(form,'q3'), h=val(form,'altezza'), r=Math.hypot(.2,h);
      const u12=k*4e-12/.4, u13=k*2*q3*1e-12/r, u23=u13;
      const top=210-h*270;
      return {
        drawing:grid()+line(200,210,460,210)+line(200,210,330,top)+line(330,top,460,210)+
          charge(200,210,2)+charge(460,210,2)+charge(330,top,q3)+text(181,242,'1: +2 μC')+
          text(430,242,'2: +2 μC')+text(353,top,'3: '+format(q3)+' μC')+
          text(282,230,'0,40 m','small')+text(250,top+55,format(r)+' m','small'),
        result:'U₁₂ = '+format(u12)+' J · U₁₃ = '+format(u13)+' J · U₂₃ = '+format(u23)+' J · U totale = '+format(u12+u13+u23)+' J.'
      };
    },
    potenziale(form) {
      const charges=sources[choose(form,'sorgenti')];
      const x=val(form,'x'),y=val(form,'y'),field=sample(x,y,charges);
      const levels=[-200,-100,-50,0,50,100,200,300];
      const gradient=[];
      for(const u of [-1.05,-.7,-.35,0,.35,.7,1.05])for(const v of [-.44,.44]){
        const f=sample(u,v,charges);
        if(!f||f.m<1)continue;
        const [p,q]=point(u,v);
        gradient.push(line(p,q,p+20*f.ex/f.m,q-20*f.ey/f.m,'flow','potential-dir'));
      }
      return {
        drawing:marker('potential-dir')+marker('potential-probe','plus')+grid()+levels.map(l=>contours(charges,l)).join('')+
          gradient.join('')+drawCharges(charges)+probe(x,y,field,'potential-probe'),
        result:field?'V(P) = '+format(field.v)+' V · |E(P)| = '+format(field.m)+' N/C. Curve tracciate ai livelli −200, −100, −50, 0, 50, 100, 200 e 300 V, dove presenti.':'P è troppo vicino a una sorgente puntiforme. Sposta la sonda.'
      };
    },
    capacita(form) {
      const area=val(form,'a'), d=val(form,'d'), dielectric=val(form,'er'), fixed=choose(form,'modo')==='isolato';
      const capacitance=epsilon*dielectric*area*1e-4/(d*1e-3);
      const initial=epsilon*100*1e-4/1e-3;
      const q=fixed?initial*12:capacitance*12;
      const v=q/capacitance;
      const distance=55+45*d, left=330-distance/2, right=330+distance/2, height=56+area*.38;
      const top=152-height/2, bottom=152+height/2;
      const marks=Array.from({length:4},(_,i)=>line(left+13,top+13+i*(height-26)/3,right-13,top+13+i*(height-26)/3,'flow','plates-dir')).join('');
      return {
        drawing:marker('plates-dir')+grid()+(dielectric>1?'<rect x="'+left+'" y="'+top+'" width="'+distance+'" height="'+height+'" fill="var(--amber-bg)" />':'')+
          '<rect x="'+(left-8)+'" y="'+top+'" width="9" height="'+height+'" rx="3" class="positive"/>'+
          '<rect x="'+right+'" y="'+top+'" width="9" height="'+height+'" rx="3" class="negative"/>'+
          marks+text(left-26,152,'+')+text(right+17,152,'−')+text(274,top-17,'d = '+format(d)+' mm')+
          text(38,282,fixed?'Armature isolate · Q fissata al valore iniziale':'Batteria ideale · Vc = 12 V'),
        result:'C = '+format(capacitance*1e12)+' pF · Q = '+format(q*1e9)+' nC · Vc = '+format(v)+' V · E ≈ '+format(v/(d*1e-3))+' N/C.'
      };
    },
    energia(form) {
      const c=val(form,'c'), v=val(form,'v'), q=c*v, u=.5*q*v/1000;
      const x=65+550*q/1500,y=246-183*v/30;
      return {
        drawing:grid()+line(65,246,630,246,'axis')+line(65,246,65,45,'axis')+
          '<path d="M65 246H'+x+'V'+y+'Z" fill="var(--amber-bg)" stroke="var(--amber)" stroke-width="2"/>'+
          line(65,246,x,y,'pathline')+'<circle cx="'+x+'" cy="'+y+'" r="5" fill="var(--ink)"/>'+
          text(32,35,'V (V)')+text(564,278,'Q (μC)')+text(46,267,'0')+
          text(Math.min(x+8,510),Math.max(35,y-10),'('+format(q)+' μC, '+format(v)+' V)','small')+
          text(40,286,'L’area del triangolo è l’energia accumulata.','small'),
        result:'Q = '+format(q)+' μC · Vc = '+format(v)+' V · U = '+format(u)+' mJ.'
      };
    }
  };
  for(const lab of document.querySelectorAll('[data-lab]')){
    const form=lab.querySelector('form'), svg=lab.querySelector('svg'), output=lab.querySelector('output');
    const update=()=>{
      for (const slider of form.querySelectorAll('input[type="range"]')) slider.nextElementSibling.textContent = format(Number(slider.value));
      const result = models[lab.dataset.lab](form);
      svg.innerHTML=result.drawing;
      output.textContent=result.result;
    };
    form.addEventListener('input',update);
    form.addEventListener('submit',event=>event.preventDefault());
    form.addEventListener('reset',()=>requestAnimationFrame(update));
    update();
  }
})();


