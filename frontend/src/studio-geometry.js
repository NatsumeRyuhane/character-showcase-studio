export function renderSeriesGeometry(ctx,poly,state,kind,cx,cy,r,a,c,p){
  if(!['facet','ribbon','blocks'].includes(kind)||!Number.isFinite(r)||r<=0)return;
  const R=r;
  const strength=Number.isFinite(state.geometryStrength)?Math.max(.5,Math.min(1.5,state.geometryStrength)):1;
  const s=Math.sin(a),q=Math.cos(a),s2=Math.sin(a*2);

  // All coordinates and widths scale with the supplied radius. Only integer
  // harmonics of a animate the devices, so a and a + 2 PI render identically.
  function stroke(points,color,width,alpha=1,cap='butt',join='miter'){
    ctx.save();ctx.globalAlpha*=alpha;ctx.strokeStyle=color;ctx.lineWidth=width;
    ctx.lineCap=cap;ctx.lineJoin=join;ctx.miterLimit=2.4;
    ctx.beginPath();points.forEach((pt,i)=>i?ctx.lineTo(pt[0]*R,pt[1]*R):ctx.moveTo(pt[0]*R,pt[1]*R));
    ctx.stroke();ctx.restore();
  }
  function face(points,color,alpha=1){
    ctx.save();ctx.globalAlpha*=alpha;
    poly(points.map(pt=>[pt[0]*R,pt[1]*R]),color);
    ctx.restore();
  }
  function curve(build,color,width,alpha=1,cap='round'){
    ctx.save();ctx.globalAlpha*=alpha;ctx.strokeStyle=color;ctx.lineWidth=width;
    ctx.lineCap=cap;ctx.lineJoin='round';ctx.beginPath();build();ctx.stroke();ctx.restore();
  }
  function tile(x,y,tw,th,round,color,alpha=1,rotation=0){
    ctx.save();ctx.translate(x*R,y*R);ctx.rotate(rotation);ctx.globalAlpha*=alpha;
    const X=-tw*R/2,Y=-th*R/2,W=tw*R,H=th*R,B=Math.min(round*R,W/2,H/2);
    ctx.beginPath();ctx.moveTo(X+B,Y);ctx.lineTo(X+W-B,Y);
    ctx.quadraticCurveTo(X+W,Y,X+W,Y+B);ctx.lineTo(X+W,Y+H-B);
    ctx.quadraticCurveTo(X+W,Y+H,X+W-B,Y+H);ctx.lineTo(X+B,Y+H);
    ctx.quadraticCurveTo(X,Y+H,X,Y+H-B);ctx.lineTo(X,Y+B);
    ctx.quadraticCurveTo(X,Y,X+B,Y);ctx.closePath();ctx.fillStyle=color;ctx.fill();ctx.restore();
  }

  ctx.save();ctx.translate(cx,cy);
  if(kind==='facet'){
    // Three separate, cut-ended rails suggest a garment pattern jig rather
    // than a circular halo. The open centre stays clear to roughly .70 R.
    ctx.rotate(-.13+s*.055);
    stroke([[-.88,-.47],[-.24,-1.00],[.42,-.94]],c.accent,R*.10*strength);
    stroke([[.72,-.59],[1.02,.08],[.78,.74]],c.fg,R*.075*strength,.76);
    stroke([[-.94,-.15],[-.85,.61],[-.41,.95]],c.accent,R*.075*strength,.80);
    stroke([[.10,1.03],[.48,.91]],c.fg,R*.032*strength,.80);

    // One short run of stitching, on the material rather than in the centre.
    ctx.save();ctx.translate(-R*.014,R*.026);ctx.setLineDash([R*.023,R*.043]);
    stroke([[-.77,-.56],[-.44,-.83]],c.paper,R*.008,.82);ctx.restore();
    stroke([[.81,-.58],[1.10,.08],[.88,.68]],c.fg,R*.008,.34);

    ctx.save();ctx.translate(R*(.82+s*.025),R*(-.95+q*.018));ctx.rotate(.20+s*.13);
    face([[-.145,-.065],[.115,-.115],[.145,.065],[-.105,.105]],c.fg,.92);
    face([[-.145,-.065],[-.075,-.078],[-.105,.105]],c.accent);
    stroke([[-.055,-.070],[.065,-.090]],c.black,R*.010,.72);ctx.restore();
    ctx.save();ctx.translate(R*(-.46+s2*.016),R*(1.115-q*.012));ctx.rotate(-.28-s*.09);
    face([[-.12,-.028],[.10,-.028],[.13,.028],[-.10,.028]],c.fg,.68);ctx.restore();
  }else if(kind==='ribbon'){
    // Long, continuously curved ribbons: no ears, tufts, or mascot silhouette.
    ctx.rotate(-.18+s*.045);
    curve(()=>{
      ctx.moveTo(-1.01*R,-.12*R);
      ctx.bezierCurveTo((-1.04+s*.02)*R,-.65*R,-.46*R,(-1.11+q*.025)*R,.18*R,(-.99+q*.02)*R);
      ctx.bezierCurveTo(.57*R,-.92*R,(.85+s*.025)*R,-.72*R,.96*R,(-.43+s2*.02)*R);
    },c.accent,R*.105*strength,.94);
    curve(()=>{
      ctx.moveTo(.95*R,(.18+q*.02)*R);
      ctx.bezierCurveTo(.83*R,(.67+s*.025)*R,.38*R,1.07*R,-.23*R,(.94+s*.018)*R);
      ctx.bezierCurveTo(-.55*R,.87*R,(-.82+q*.02)*R,.66*R,-.94*R,.38*R);
    },c.fg,R*.085*strength,.72);

    // A loose counter-curve and one glint give a satin edge, with large gaps.
    curve(()=>{
      ctx.moveTo(-.57*R,-1.15*R);
      ctx.bezierCurveTo(.10*R,(-1.34+s*.03)*R,1.13*R,-.78*R,1.14*R,-.04*R);
      ctx.bezierCurveTo((1.16+q*.02)*R,.52*R,.76*R,1.13*R,.26*R,1.17*R);
    },c.fg,R*.010,.32);
    curve(()=>{
      ctx.moveTo(-.77*R,-.68*R);
      ctx.bezierCurveTo(-.56*R,-.89*R,-.26*R,(-1.00+q*.025)*R,-.01*R,-.97*R);
    },c.paper,R*.012,.72);
    curve(()=>{
      ctx.moveTo(-.65*R,(1.00+s*.016)*R);
      ctx.bezierCurveTo(-.36*R,1.18*R,.03*R,(1.18-q*.025)*R,.29*R,1.06*R);
    },c.accent,R*.025*strength,.72);
  }else{
    // Independent rounded corners leave four openings; one stepped corner
    // and two detached tiles provide the MINI rhythm without filling it in.
    ctx.rotate(-.07+s*.035);
    curve(()=>{
      ctx.moveTo(-.98*R,-.10*R);ctx.lineTo(-.98*R,-.57*R);
      ctx.quadraticCurveTo(-.98*R,-.95*R,-.59*R,-.95*R);ctx.lineTo(-.16*R,-.95*R);
    },c.accent,R*.115*strength,1,'butt');
    curve(()=>{
      ctx.moveTo(.20*R,-.95*R);ctx.lineTo(.56*R,-.95*R);
      ctx.quadraticCurveTo(.95*R,-.95*R,.95*R,-.56*R);ctx.lineTo(.95*R,-.15*R);
    },c.fg,R*.085*strength,.86,'butt');
    curve(()=>{
      ctx.moveTo(1.00*R,.20*R);ctx.lineTo(1.00*R,.59*R);
      ctx.quadraticCurveTo(1.00*R,.92*R,.71*R,.92*R);
      ctx.lineTo(.43*R,.92*R);ctx.lineTo(.43*R,1.055*R);ctx.lineTo(.11*R,1.055*R);
    },c.accent,R*.12*strength,.86,'butt');
    curve(()=>{
      ctx.moveTo(-.22*R,.98*R);ctx.lineTo(-.57*R,.98*R);
      ctx.quadraticCurveTo(-.98*R,.98*R,-.98*R,.58*R);ctx.lineTo(-.98*R,.26*R);
    },c.fg,R*.065*strength,.62,'butt');

    tile(-1.12-s*.020,.065+q*.035,.22,.22,.060,c.accent,1,-.14+s*.14);
    tile(.16+q*.026,-1.16-s*.016,.25,.115,.025,c.fg,.86,.12-s*.075);
    stroke([[.68,1.085],[.91,1.085]],c.fg,R*.012,.44,'round');
  }
  ctx.restore();
}
