import type { JobResult } from "./job-results";

// Only passed to the explicitly labelled demo workspace. Never returned by the API.
export const demoJobResults: JobResult[] = [
  { id: "fictional-planning", title: "Global Planning Director", company: "Fictional Example Labs", location: "Tel Aviv, Israel", description: "Fictional demonstration only. Lead planning and forecasting. Experience with ERP and S&OP.", postedAt: "2 days ago", schedule: "Full-time", remote: null, sources: [{ name: "careers.example.com", url: "https://careers.example.com/jobs/planning-demo" }, { name: "jobs.example.org", url: "https://jobs.example.org/planning-demo" }] },
  { id: "fictional-data", title: "Data Analyst", company: "Fictional Example Studio", location: "Haifa, Israel", description: "Fictional demonstration only. Analyze data using SQL and Excel. Work with product teams.", postedAt: "1 day ago", schedule: "Full-time", remote: null, sources: [{ name: "jobs.example.org", url: "https://jobs.example.org/data-demo" }] },
];
