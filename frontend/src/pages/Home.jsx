import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getWorkflows, getPendingApprovals } from "../services/api";

export default function Home() {
  const [workflowsCount, setWorkflowsCount] = useState(null);
  const [pendingCount, setPendingCount] = useState(null);
  const [recentWorkflows, setRecentWorkflows] = useState([]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const workflows = await getWorkflows();
        if (!mounted) return;
        setWorkflowsCount(workflows.length || 0);
        setRecentWorkflows(workflows.slice(0, 3) || []);

        const approvals = await getPendingApprovals();
        if (!mounted) return;
        setPendingCount(approvals.length || 0);
      } catch (err) {
        console.error("Home: failed to load stats", err);
        if (!mounted) return;
        setWorkflowsCount(0);
        setPendingCount(0);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="space-y-8">
      <div className="bg-white p-8 rounded-lg shadow">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-4xl font-extrabold text-gray-900">
              Approval Orchestrator
            </h1>
            <p className="text-gray-600 mt-2">
              Manage workflows and approvals — get things approved faster.
            </p>
            <div className="mt-4 flex gap-3">
              <Link to="/create">
                <button className="btn-primary">Create Workflow</button>
              </Link>
              <Link to="/dashboard">
                <button className="btn-outline">Open Dashboard</button>
              </Link>
            </div>
          </div>

          <div className="mt-6 md:mt-0 grid grid-cols-3 gap-4">
            <div className="p-4 bg-gray-50 rounded flex items-center gap-3">
              <svg
                className="w-6 h-6 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V7M16 3v4M8 3v4"
                />
              </svg>
              <div>
                <div className="text-sm text-gray-500">Workflows</div>
                <div className="text-2xl font-semibold text-gray-900">
                  {workflowsCount ?? "–"}
                </div>
              </div>
            </div>
            <div className="p-4 bg-gray-50 rounded flex items-center gap-3">
              <svg
                className="w-6 h-6 text-yellow-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3"
                />
              </svg>
              <div>
                <div className="text-sm text-gray-500">Pending Approvals</div>
                <div className="text-2xl font-semibold text-gray-900">
                  {pendingCount ?? "–"}
                </div>
              </div>
            </div>
            <div className="p-4 bg-gray-50 rounded flex items-center gap-3">
              <svg
                className="w-6 h-6 text-gray-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <div>
                <div className="text-sm text-gray-500">Recent</div>
                <div className="text-2xl font-semibold text-gray-900">
                  {recentWorkflows.length}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link
          to="/dashboard?view=overview"
          className="card hover:shadow-md transition p-4 flex items-start gap-3"
        >
          <svg
            className="w-8 h-8 text-blue-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 10h4v11H3zM10 3h4v18h-4zM17 7h4v14h-4z"
            />
          </svg>
          <div>
            <h3 className="font-semibold">Overview</h3>
            <p className="text-sm text-gray-600 mt-2">
              At-a-glance status of approvals and workflows.
            </p>
          </div>
        </Link>

        <Link
          to="/dashboard?view=workflows"
          className="card hover:shadow-md transition p-4 flex items-start gap-3"
        >
          <svg
            className="w-8 h-8 text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 17v-6a2 2 0 012-2h4"
            />
          </svg>
          <div>
            <h3 className="font-semibold">Workflows</h3>
            <p className="text-sm text-gray-600 mt-2">
              Browse and edit workflows.
            </p>
          </div>
        </Link>

        <Link
          to="/dashboard?view=approvals"
          className="card hover:shadow-md transition p-4 flex items-start gap-3"
        >
          <svg
            className="w-8 h-8 text-yellow-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3"
            />
          </svg>
          <div>
            <h3 className="font-semibold">Approvals</h3>
            <p className="text-sm text-gray-600 mt-2">
              Act on pending approvals quickly.
            </p>
          </div>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link
          to="/analytics"
          className="card hover:shadow-md transition p-4 flex items-start gap-3"
        >
          <svg
            className="w-8 h-8 text-purple-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0-012-2z"
            />
          </svg>
          <div>
            <h3 className="font-semibold">Analytics Dashboard</h3>
            <p className="text-sm text-gray-600 mt-2">
              Real-time insights, charts, and performance metrics for your
              approval workflows.
            </p>
          </div>
        </Link>

        <Link
          to="/create"
          className="card hover:shadow-md transition p-4 flex items-start gap-3"
        >
          <svg
            className="w-8 h-8 text-indigo-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
            />
          </svg>
          <div>
            <h3 className="font-semibold">Create Workflow</h3>
            <p className="text-sm text-gray-600 mt-2">
              Start a new approval workflow with custom steps.
            </p>
          </div>
        </Link>
      </div>
    </div>
  );
}
