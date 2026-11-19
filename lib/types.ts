export type Priority='Critical'|'High'|'Medium'|'Low';
export type Task={id:string;title:string;description:string;duration:number;priority:Priority;deadline:string;category:string;difficulty:'Easy'|'Medium'|'Hard';fixed:boolean;dependencies:string[];completed:boolean};
export type Scheduled={taskId:string;date:string;start:string;end:string};
export type Prefs={start:string;end:string;breakDuration:number;lunchStart:string;lunchDuration:number;workload:number;buffer:number;energy:string;workStyle:string;commitments:string;mode:'daily'|'weekly'};
export type Plan={id:string;createdAt:string;mode:'daily'|'weekly';scheduled:Scheduled[];unscheduled:{taskId:string;reason:string}[];explanation:string;source:string};
export const sampleTasks:Task[]=[
{id:'t1',title:'Finish portfolio refresh',description:'Put the finishing touches on the case studies.',duration:120,priority:'High',deadline:'',category:'Creative',difficulty:'Hard',fixed:false,dependencies:[],completed:false},
{id:'t2',title:'Reply to client emails',description:'Clear the inbox and send project updates.',duration:30,priority:'Medium',deadline:'',category:'Work',difficulty:'Easy',fixed:false,dependencies:[],completed:false},
{id:'t3',title:'Plan next week’s content',description:'Sketch out ideas for the week ahead.',duration:60,priority:'Medium',deadline:'',category:'Planning',difficulty:'Medium',fixed:false,dependencies:[],completed:false},
{id:'t4',title:'Take a proper lunch break',description:'Step away from the screen for a bit.',duration:45,priority:'Low',deadline:'',category:'Personal',difficulty:'Easy',fixed:false,dependencies:[],completed:false}];
export const defaultPrefs:Prefs={start:'09:00',end:'17:00',breakDuration:10,lunchStart:'13:00',lunchDuration:45,workload:7,buffer:10,energy:'Morning',workStyle:'Balanced',commitments:'',mode:'daily'};
