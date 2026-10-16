import React,{useEffect} from 'react';
import {Link,Navigate,useParams} from '#navigation';
import {Helmet} from 'react-helmet-async';
import {designs,getDesign,REVIEW_BASE} from './designOptions';
import {Concept01,Concept02,Concept03,Concept04,Concept05,Concept06,Concept07} from './ConceptPages';
import './trainingDesignReview.css';
const components=[Concept01,Concept02,Concept03,Concept04,Concept05,Concept06,Concept07];
export default function DesignPreview(){
 const {designId}=useParams();const design=getDesign(designId);const index=designs.findIndex(d=>d.id===designId);
 useEffect(()=>{window.scrollTo(0,0);},[designId]);
 if(!design)return <Navigate replace to={REVIEW_BASE}/>;
 const Screen=components[index];
 return <div className="itdr-preview-page">
   <Helmet><title>{design.name} | IM&A Design Review</title><meta name="robots" content="noindex,nofollow,noarchive"/></Helmet>
   <div className="itdr-review-bar"><Link to={REVIEW_BASE}>← All designs</Link><div><strong>{design.number} / 07 · {design.name}</strong><small>Design prototype · booking disabled</small></div><nav>
    <Link to={`${REVIEW_BASE}/${designs[(index+6)%7].id}`}>← Prev</Link>
    <Link to={`${REVIEW_BASE}/${designs[(index+1)%7].id}`}>Next →</Link>
   </nav></div>
   <Screen/>
 </div>;
}
