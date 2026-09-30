// Frame-accurate renderer: seeks the GSAP timeline for every frame and pipes JPEGs to ffmpeg.
// Usage: FMT=sq|reels node render.js stills 1.5,3,8   -> preview stills
//        FMT=sq|reels node render.js video             -> out/<fmt>_silent.mp4
const path=require('path'), fs=require('fs'), {spawn}=require('child_process');
const {chromium}=require(process.env.PW_PATH||'playwright');
const FFMPEG=process.env.FFMPEG, FPS=30, FMT=process.env.FMT||'reels', HH=FMT==='sq'?1080:1920;
(async()=>{
  const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1080,height:HH}});
  await p.goto('file://'+path.join(__dirname,'index.html')+(FMT==='sq'?'?fmt=sq':'')); await p.evaluate(()=>document.fonts.ready);
  await p.evaluate(()=>Promise.all([...document.images].map(i=>i.decode().catch(()=>{}))));
  fs.mkdirSync(path.join(__dirname,'out'),{recursive:true});
  if(process.argv[2]==='stills'){
    for(const t of process.argv[3].split(',').map(Number)){
      await p.evaluate(t=>seek(t),t);
      await p.screenshot({path:path.join(__dirname,'out',`still_${FMT}_${t.toFixed(2)}.jpg`),type:'jpeg',quality:80});
    }
  } else {
    const dur=await p.evaluate(()=>DURATION), n=Math.round(dur*FPS);
    const ff=spawn(FFMPEG,['-y','-f','image2pipe','-framerate',String(FPS),'-c:v','mjpeg','-i','-','-c:v','libx264','-preset','medium','-crf','18','-pix_fmt','yuv420p','-r',String(FPS),path.join(__dirname,'out',`${FMT}_silent.mp4`)],{stdio:['pipe','ignore','inherit']});
    for(let i=0;i<n;i++){
      await p.evaluate(t=>seek(t),i/FPS);
      const buf=await p.screenshot({type:'jpeg',quality:92});
      if(!ff.stdin.write(buf)) await new Promise(r=>ff.stdin.once('drain',r));
      if(i%150===0) console.log('frame',i,'/',n);
    }
    ff.stdin.end(); await new Promise(r=>ff.on('close',r));
  }
  await b.close();
})();
