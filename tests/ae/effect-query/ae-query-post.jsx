(function(){
  var result=[],p=app.project||app.newProject(),c=p.items.addComp('STUDIO FX QUERY',320,180,1,1,30),l=c.layers.addSolid([0,0,0],'FX QUERY',320,180,1);
  try{
    for(var i=0;i<app.effects.length;i++)if(/glow|gaussian blur|noise/i.test(app.effects[i].displayName)||/ADBE Glo2|ADBE Gaussian Blur 2|ADBE Noise/.test(app.effects[i].matchName)){
      var descriptor=app.effects[i],e=l.property('ADBE Effect Parade').addProperty(descriptor.matchName),info={name:descriptor.displayName,matchName:descriptor.matchName,properties:[]};
      for(var j=1;j<=e.numProperties;j++){var prop=e.property(j);info.properties.push(j+' '+prop.name+' ['+prop.matchName+'] '+prop.value);}
      result.push(info.name+' ['+info.matchName+']\n'+info.properties.join('\n'));
    }
  }catch(error){result.push(String(error)+' line '+error.line);}
  var f=File(File($.fileName).parent.fsName+'/ae-post-properties.txt');f.encoding='UTF-8';f.open('w');f.write(result.join('\n\n'));f.close();c.remove();app.quit();
})();
