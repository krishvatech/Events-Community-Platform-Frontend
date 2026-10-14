export const REVIEW_BASE = '/training-design-review';
export const designs = [
 {id:'design-01',number:'01',name:'Premium Executive Education',category:'Premium editorial',description:'Dark, elegant and authoritative with a business-school rhythm.'},
 {id:'design-02',number:'02',name:'Conversion-Focused Landing Page',category:'Enrollment-led',description:'A clear decision path for formats, fees, sessions and enquiry.'},
 {id:'design-03',number:'03',name:'Modern Training Academy',category:'Curriculum-first',description:'Bright learning-platform energy with module-led discovery.'},
 {id:'design-04',number:'04',name:'Interactive Deal Journey',category:'Lifecycle storytelling',description:'The M&A curriculum presented as a guided transaction journey.'},
 {id:'design-05',number:'05',name:'Minimal Luxury',category:'Refined editorial',description:'Quiet typography, restrained detail and high readability.'},
 {id:'design-06',number:'06',name:'Authority and Trust',category:'Credibility-first',description:'Faculty, designation, testimonials and evidence in front.'},
 {id:'design-07',number:'07',name:'Premium Hybrid',category:'Executive conversion',description:'Premium visual quality balanced with practical enrollment clarity.'},
];
export const getDesign = id => designs.find(d => d.id === id);
