import snapshot from './wordpressSnapshot.json';

const canonical = 'https://imaa-institute.org/m-and-a-trainings/international-m-and-a/';
const catalog = 'https://imaa-institute.org/m-and-a-trainings/';

// Factual programme content captured from the official IMAA WordPress programme page
// on 14 Oct 2026, with the long-form curriculum/faculty/testimonial extraction kept
// in wordpressSnapshot.json. No fetch occurs in the browser.
export const course = {
 title:'International M&A Expert',
 acronym:'IM&A',
 label:'International M&A Expert (IM&A)',
 canonical,
 catalog,
 capturedAt:'2026-10-14',
 intro:'This cross-disciplinary curriculum provides a holistic view of the M&A process - from strategy and valuation to execution and post-merger integration management.',
 formats:[
  {
   id:'online',
   name:'Online',
   duration:'60 approx. hours',
   price:'US $3,290',
   oldPrice:'US $4,360',
   note:'Bundle & Save',
   mode:'Self-paced',
   summary:'Take the number one M&A program online available worldwide with real world content developed and instructed by M&A practitioners.',
   bookingLink:'https://imaa-institute.org/events/ima-certificate-online/'
  },
  {
   id:'live',
   name:'Interactive Online Live',
   duration:'30 approx. hours',
   price:'US $3,790',
   oldPrice:'US $4,390',
   note:'Early Bird',
   mode:'Live instructor-led',
   summary:'Live online delivery for participants who want scheduled sessions, interaction and instructor-led discussion.',
   bookingLink:'https://imaa-institute.org/m-and-a-trainings/international-m-and-a/#schedule-and-fees'
  },
  {
   id:'onsite',
   name:'Onsite',
   duration:'30 approx. hours',
   price:'US $4,890',
   oldPrice:'US $5,490',
   note:'Early Bird',
   mode:'In-person',
   summary:'In-person workshops at published global locations with face-to-face faculty and peer networking.',
   bookingLink:'https://imaa-institute.org/m-and-a-trainings/international-m-and-a/#schedule-and-fees'
  },
  {
   id:'inhouse',
   name:'Inhouse',
   duration:'Tailored to your organisation',
   price:'On request',
   oldPrice:'',
   note:'Custom-fit content, flexible delivery and confidential setting',
   mode:'Private team training',
   summary:'Available as a tailored training for teams and organisations.',
   bookingLink:'https://imaa-institute.org/m-and-a-trainings/in-house-training/'
  }
 ],
 benefits:['Internationally recognized designations','Copies of certifications, presentations & materials','1-year IMAA charter-holding membership','1-year access to the entire IMAA eLibrary'],
 practiceAreas:[
  {title:'Expanding your M&A perspective',text:'Hone new target identification strategies and advanced synergy analyses to close the best deals and navigate common post-merger integration pitfalls.'},
  {title:'Mapping out the negotiation landscape',text:'Identify true stakeholders and likely competitors for the target ahead of time, so you are ready with the right strategies and tactics.'},
  {title:'Improving your Foresight',text:'Practice implementing exceptional value analysis and comprehensive due diligence by looking ahead and reasoning back.'}
 ],
 modules:[
  {title:'Essentials of M&A',tag:'01',line:'Deal types, M&A process, strategies, negotiation, takeovers and transaction success factors.'},
  {title:'Due Diligence',tag:'02',line:'Financial, tax, legal, HR and commercial due diligence.'},
  {title:'Valuation',tag:'03',line:'Valuation techniques, private equity and start-up valuation, deal financing and structuring.'},
  {title:'Post Merger Integration (PMI)',tag:'04',line:'Integration governance, synergies, function integration and change management.'}
 ],
 moduleProducts:[
  {title:'Essentials of M&A (Module 1)',format:'Online',price:'$1,090.00',summary:'The Essentials of M&A module provides a solid foundation in M&A and covers deal types, M&A process, strategies, due diligence, success factors and takeover strategies.'},
  {title:'Due Diligence (Module 2)',format:'Online',price:'$1,090.00',summary:'The Due Diligence module covers financial, tax, legal, HR and other due diligence areas.'},
  {title:'Valuation (Module 3)',format:'Online',price:'$1,090.00',summary:'The valuation module explores M&A valuation techniques, private equity and start-up valuation, deal financing, payment structure and deal design.'},
  {title:'Post Merger Integration (Module 4)',format:'Online',price:'$1,090.00',summary:'The PMI module covers planning and execution, governance, function integration and change management in M&A.'}
 ],
 sessions:[
  {mode:'Online',title:'IM&A Certificate ONLINE',when:'Start right away',start:'Anytime',place:'Online',fee:'Bundle & Save: US $3,290',oldFee:'US $4,360',status:'Open',link:'https://imaa-institute.org/events/ima-certificate-online/'},
  {mode:'Onsite',title:'*SOLD OUT* IM&A Onsite New York October 19-23, 2026',when:'New York | Oct 2026',start:'19 Oct on 00:00 UTC',place:'New York',fee:'US $4,890',oldFee:'US $5,490',status:'Sold out',link:'https://imaa-institute.org/events/ima-onsite-new-york-october-19-23-2026/'},
  {mode:'Interactive Online Live',title:'IM&A February - April 2027',when:'Feb - Apr 2027',start:'18 Feb on 13:00 UTC',place:'Online',fee:'Early Bird Fees: US $3,790',oldFee:'US $4,390',status:'Open',link:'https://imaa-institute.org/events/ima-february-april-2027/'},
  {mode:'Onsite',title:'IM&A Onsite New York May 4-6, 2027',when:'New York | May 2027',start:'04 May on 00:00 UTC',place:'New York',fee:'Early Bird Fees: US $4,890',oldFee:'US $5,490',status:'Open',link:'https://imaa-institute.org/events/ima-onsite-new-york-may-4-6-2027/'},
  {mode:'Interactive Online Live',title:'IM&A May - July 2027',when:'May - Jul 2027',start:'20 May on 13:00 UTC',place:'Online',fee:'Early Bird Fees: US $3,790',oldFee:'US $4,390',status:'Open',link:'https://imaa-institute.org/events/ima-may-july-2027/'},
  {mode:'Onsite',title:'IM&A Onsite London May 24-28, 2027',when:'London | May 2027',start:'24 May on 00:00 UTC',place:'London',fee:'Early Bird Fees: US $4,890',oldFee:'US $5,490',status:'Open',link:'https://imaa-institute.org/events/ima-onsite-london-may-24-28-2027/'},
  {mode:'Interactive Online Live',title:'IM&A September - October 2027',when:'Sep - Oct 2027',start:'02 Sep on 13:00 UTC',place:'Online',fee:'Early Bird Fees: US $3,790',oldFee:'US $4,390',status:'Open',link:'https://imaa-institute.org/events/ima-september-october-2027/'},
  {mode:'Onsite',title:'IM&A Onsite Singapore September 13-16, 2027',when:'Singapore | Sep 2027',start:'13 Sep on 00:00 UTC',place:'Singapore',fee:'Early Bird Fees: US $4,890',oldFee:'US $5,490',status:'Open',link:'https://imaa-institute.org/events/ima-onsite-singapore-september-13-16-2027/'},
  {mode:'Onsite',title:'IM&A Onsite Amsterdam October 4-8, 2027',when:'Amsterdam | Oct 2027',start:'04 Oct on 00:00 UTC',place:'Amsterdam',fee:'Early Bird Fees: US $4,890',oldFee:'US $5,490',status:'Open',link:'https://imaa-institute.org/events/ima-onsite-amsterdam-october-4-8-2027/'},
  {mode:'Interactive Online Live',title:'IM&A October - December 2027',when:'Oct - Dec 2027',start:'07 Oct on 13:00 UTC',place:'Online',fee:'Early Bird Fees: US $3,790',oldFee:'US $4,390',status:'Open',link:'https://imaa-institute.org/events/ima-october-december-2027/'},
  {mode:'Onsite',title:'IM&A Onsite New York October 18-22, 2027',when:'New York | October 2027',start:'18 Oct on 00:00 UTC',place:'New York',fee:'Early Bird Fees: US $4,890',oldFee:'US $5,490',status:'Open',link:'https://imaa-institute.org/events/ima-onsite-new-york-october-18-22-2027/'},
  {mode:'Onsite',title:'IM&A Onsite Riyadh, Saudi Arabia Nov 28 - Dec 1, 2027',when:'Riyadh | Nov 2027',start:'28 Nov on 00:00 UTC',place:'Riyadh',fee:'Early Bird Fees: US $4,890',oldFee:'US $5,490',status:'Open',link:'https://imaa-institute.org/events/ima-onsite-riyadh-saudi-arabia-nov-28-dec-1-2027/'}
 ],
 bundles:[
  {name:'Combination: IM&A and CPMI Online',oldPrice:'$5,470.00',price:'$4,935.00'},
  {name:'Combination: IM&A and HRM&A Online',oldPrice:'$4,380.00',price:'$4,112.50'},
  {name:'Combination: IM&A and LM&A Online',oldPrice:'$5,470.00',price:'$4,935.00'},
  {name:'Combination: IM&A and M&AP Online',oldPrice:'$4,380.00',price:'$4,112.50'},
  {name:'Combination: IM&A, M&AP and CPMI Online (all 3 designations)',oldPrice:'$6,560.00',price:'$5,757.50'}
 ],
 comparisonRows:[
  {feature:'Real-life business cases',online:true,onsite:true},
  {feature:'All mandatory course materials included',online:true,onsite:true},
  {feature:'Lifelong online access to most current content',online:true,onsite:true},
  {feature:'1-year Individual IMAA Membership',online:true,onsite:true},
  {feature:'Start right away',online:true,onsite:false},
  {feature:'On-Demand video lectures & direct tutoring',online:true,onsite:false},
  {feature:'Full flexibility',online:true,onsite:false},
  {feature:'No time constraint',online:true,onsite:false},
  {feature:'Work from anywhere in the world',online:true,onsite:false},
  {feature:'Different dates & locations worldwide',online:false,onsite:true},
  {feature:'Interactive discussions',online:false,onsite:true},
  {feature:'Networking with peers',online:false,onsite:true},
  {feature:'Complete the program in 6 days',online:false,onsite:true},
  {feature:'Meet face to face with faculty',online:false,onsite:true}
 ],
 faqs:[
  {question:'Accreditation and Recognition',answer:'We are the global number #1 provider in M&A education. Participants sign up or companies send their employees in order to prepare for transactions or to enhance their qualification. Future employers reach out to us to check the credentials of candidates and their current status as a charterholder. Potential clients look to us to recommend advisors. We are a high quality provider and are recognized by many other institutions as a continued education provider.'},
  {question:'How long does it take to complete the IM&A Certificate?',answer:'The IM&A Certification is designed as a part-time program for professionals. The total time of completion depends on your prior background and time you can devote to this. In total for the online program it may take about 72.5 hours of study. Our fastest participants complete it within 2 months.'},
  {question:'What is included in the fee?',answer:'Our tuition fees include all mandatory and recommended study materials. In addition you get access to our e-library.'},
  {question:'When can I enroll for and start with the IM&A Certificate?',answer:'You can enroll at any time for the Certificate Program online and start right away. For our onsite M&A courses please check the dates and locations.'},
  {question:'Can I take the M&A Certificate entirely online?',answer:'Yes, you can take the entire program online from anywhere in the world or while travelling. This is what many of our participants do. For the completion of the M&A Certification there is no physical attendance necessary. However, you can combine online with onsite workshops to reach your designation.'},
  {question:'How many participants take your M&A programs?',answer:'Our courses and programs in Mergers & Acquisitions, Due Diligence, Valuation and Post Merger Integration (PMI) have taken by more than 2,200 participants from all around the world.'},
  {question:'What is the difference to other training providers?',answer:'We are the number #1 provider and set the standards. Compared with academic executive education offerings, our faculty members are not pure academics - they have closed M&A deals as professionals themselves. Compared with for-profit providers, we are purely focused on M&A trainings and bring in a solid foundation, structured approach and international dimension.'},
  {question:'What is the difference to other certificate programs?',answer:'If you compare our programs with the CFA, CAIA, CIMA, or others - we are purely focused on M&A only and are very complementary to these programs. There is very little overlap among the content and insights that our programs provide. Most of them accept our program as continued education.'},
  {question:'Where can I ask more questions about your M&A training?',answer:'If you have additional questions, please reach out via chat, contact form, or phone. IMAA looks forward to hearing about your needs and questions.'}
 ],
 callsToAction:[
  {title:'On-Demand Learning at Your Fingertips',text:'The M&A profession is evolving - are you? Train with the global #1 M&A institution trusted by top professionals. Gain cutting-edge expertise and stay ahead - anytime, anywhere.',action:'Get instant access',target:'#formats'},
  {title:'Get Personalized Insights',text:"Let's talk about your goals and explore how we can help. No pressure, just valuable insights.",action:'Schedule your call now',target:'#brochure'},
  {title:'Discover More - Get Your Free Brochure',text:'Request brochure information for the IM&A programme and related M&A training options.',action:'Request brochure',target:'#brochure'}
 ],
 images:{
  hero:'https://imaa-institute.org/wp-content/uploads/2024/07/IMA-Training-Course-featured-image.webp',
  curriculum:'https://imaa-institute.org/wp-content/uploads/2024/07/IMA-Curriculum-Tab-Featured-Image.webp',
  faculty:'https://imaa-institute.org/wp-content/uploads/2024/07/IMA-Faculty-Tab-Featured-Image-500x332.webp',
  animation:'https://imaa-institute.org/wp-content/uploads/2023/10/IMA-animation-blue.gif'
 },
 facultyNames:['Prof. Dr. Christopher Kummer','Prof. David J. Brophy, PhD','Prof. Andrew Campbell','Andre Gan','Darryl Kinneally','Dhruv Mehra'],
 testimonialsNames:['Dr. Saeed Ahmed Al-Gailani','Mohamed Shouman','Michael Reed','Aline Soghomonian','Christian Muntean','Shaune Lim','Ezinne Q. Joshua','Chuck Adams','Kenneth Penn, CPA'],
 source:snapshot
};

export const getFaculty = () => course.facultyNames.map((name, index) => {
 const source = course.source.faculty?.find((person) => person.name.toLowerCase() === name.toLowerCase());
 return {
  name,
  title:index === 0 ? 'Founder and CEO' : 'Faculty',
  image:source?.image || ''
 };
});

export const getTestimonials = () => course.testimonialsNames.map((name) => {
 const source = course.source.testimonials?.find((person) => person.name.toLowerCase() === name.toLowerCase());
 return {
  name,
  quote:source?.quote || '',
  role:source?.role || '',
  image:source?.image || ''
 };
});
