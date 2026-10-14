// Simple dependency-free validation of the React redesign installation.
import {readFileSync,existsSync} from 'node:fs';
import {resolve,join} from 'node:path';
const root=resolve(process.argv.find(a=>a.startsWith('--frontend='))?.split('=')[1]||'.');
const feature=join(root,'src/features/trainingDesignReview');
const read=n=>{const f=join(feature,n);if(!existsSync(f))throw new Error(`Missing ${f}`);return readFileSync(f,'utf8')};
try {
 const app=readFileSync(join(root,'src/App.jsx'),'utf8');
 for(const s of ['/training-design-review','DesignGallery','DesignPreview'])if(!app.includes(s))throw new Error(`Missing App.jsx route/import: ${s}`);
 const preview=read('DesignPreview.jsx');
 if(preview.includes('<iframe')||preview.includes('previewUrl('))throw new Error('Old iframe preview still present');
 const pages=read('ConceptPages.jsx');
 for(let i=1;i<=7;i++)if(!pages.includes(`export function Concept${String(i).padStart(2,'0')}`))throw new Error(`Missing React design ${i}`);
 const gallery=read('DesignGallery.jsx');
 if(gallery.includes('slice(page*4,page*4+4)')||gallery.includes('setPage('))throw new Error('Gallery still paginates instead of showing all seven cards');
 if((gallery.match(/designs\.map/g)||[]).length<1)throw new Error('Gallery does not render all design metadata');
 const wp=JSON.parse(read('wordpressSnapshot.json'));
 const complete=wp.source==='local-wordpress-html'&&['overview','designation','prerequisites','audience'].every(k=>wp[k]?.length>0)&&['Essentials of M&A','Due Diligence','Valuation','Post Merger Integration (PMI)'].every(k=>wp.curriculum?.[k]?.length>0);
 console.log('PASS: 7 React concepts, full seven-card gallery, preview routes, no iframe.');
 console.log(complete?'PASS: local WordPress content JSON present and structurally complete.':'WARNING: local exact-content JSON is missing/incomplete. Run extract-react-content.py before client review.');
 if(!complete&&process.argv.includes('--require-source'))process.exitCode=2;
}catch(e){console.error('ERROR:',e.message);process.exitCode=1}
