import { TimelineItem } from "./TimeLine";

export const exampleItems: TimelineItem[] = [
  {
    id: "1",
    status: "completed",
    title: "Project Kickoff",
    details: (
      <>
        Successfully launched the project. View the{" "}
        <a href="#" className="text-blue-500 hover:underline">
          kickoff document
        </a>
        .
      </>
    ),
  },
  {
    id: "2",
    status: "warning",
    title: "Design Review",
    details: (
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
  {
    id: "3",
    status: "error",
    title: "Backend Integration",
    details: (
      <>
        Critical error in API integration. See the{" "}
        <a href="#" className="text-blue-500 hover:underline">
          error log
        </a>
        .
      </>
    ),
  },
  {
    id: "4",
    status: "waiting",
    title: "User Testing",
    details: (
      <>
        Awaiting user feedback. Check the{" "}
        <a href="#" className="text-blue-500 hover:underline">
          testing schedule
        </a>
        .
      </>
    ),
  },
  {
    id: "5",
    status: "success",
    title: "Final Deployment",
    details: (
      <>
        Successfully deployed to production. View the{" "}
        <a href="#" className="text-blue-500 hover:underline">
          deployment report
        </a>
        .
      </>
    ),
  },
  {
    id: "6",
    status: "waiting",
    title: "Waiting for tx",
    details: (
      <>
        Awaiting the tx to be mined. Check the{" "}
        <a href="#" className="text-blue-500 hover:underline">
          tx status
        </a>
        .
      </>
    ),
  },
];
