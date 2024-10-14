import { TimelineItem } from "./TimeLine";

export const exampleItems: TimelineItem[] = [
  {
    id: "1",
    status: "completed",
    title: "Project Kickoff",
    details: [
      {
        id: "1-1",
        content: (
          <>
            Successfully launched the project. View the{" "}
            <a href="#" className="text-blue-500 hover:underline">
              kickoff document
            </a>
            .
          </>
        ),
      },
    ],
  },
  {
    id: "2",
    status: "warning",
    title: "Design Review",
    details: [
      {
        id: "2-1",
        content: (
          <>
            <ul className="list-disc pl-5">
              <li>Minor issues found during review.</li>
              <li>
                Check the{" "}
                <a href="#" className="text-accent hover:underline">
                  design feedback
                </a>
                .
              </li>
            </ul>
          </>
        ),
      },
    ],
  },
  {
    id: "3",
    status: "error",
    title: "Backend Integration",
    details: [
      {
        id: "3-1",
        content: (
          <>
            Critical error in API integration. See the{" "}
            <a href="#" className="text-blue-500 hover:underline">
              error log
            </a>
            .
          </>
        ),
      },
    ],
  },
  {
    id: "4",
    status: "waiting",
    title: "User Testing",
    details: [
      {
        id: "4-1",
        content: (
          <>
            Awaiting user feedback. Check the{" "}
            <a href="#" className="text-blue-500 hover:underline">
              testing schedule
            </a>
            .
          </>
        ),
      },
    ],
  },
  {
    id: "5",
    status: "success",
    title: "Final Deployment",
    details: [
      {
        id: "5-1",
        content: (
          <>
            Successfully deployed to production. View the{" "}
            <a href="#" className="text-blue-500 hover:underline">
              deployment report
            </a>
            .
          </>
        ),
      },
    ],
  },
  {
    id: "6",
    status: "waiting",
    title: "Waiting for tx",
    details: [
      {
        id: "6-1",
        content: (
          <>
            Awaiting the tx to be mined. Check the{" "}
            <a href="#" className="text-blue-500 hover:underline">
              tx status
            </a>
            .
          </>
        ),
      },
    ],
  },
];
