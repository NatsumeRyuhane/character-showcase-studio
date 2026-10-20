// Deterministic, seekable CRT power-off envelope shared by browser and AE.
// ES3 syntax is intentional: this function also runs inside AE expressions.
function studioCRTPose(progress){
  var q=Math.max(0,Math.min(1,progress));
  function e(x){x=Math.max(0,Math.min(1,x));return x*x*(3-2*x)}
  var shutter=e((q-.12)/.44),active=e(q/.035)*(1-e((q-.46)/.1));
  return {
    shutter:shutter,
    signal:e((q-.38)/.14)*(1-e((q-.86)/.055)),
    signalWidth:1-e((q-.62)/.27),
    dot:e((q-.77)/.065)*(1-e((q-.87)/.13)),
    dotScale:1-.88*e((q-.84)/.16),
    flash:.15*e(q/.045)*(1-e((q-.07)/.12)),
    scan:.18*active,
    jitter:Math.sin(q*149)*Math.sin(q*37)*.0014*active,
    flicker:1-.12*Math.pow(Math.max(0,Math.sin(q*173)),2)*active
  };
}
