// Only explicit stage values establish tool intent. Free-text actions are never parsed.
export function applicationContextTool(application:{status:string;appliedDate?:string}){
 if(application.status==='Interview')return 'interview' as const;
 if(application.status==='Offer')return 'offer' as const;
 if(application.status==='Follow-up due')return 'followUp' as const;
 if(application.status==='Considering'&&!application.appliedDate)return 'cv' as const;
 return null;
}
