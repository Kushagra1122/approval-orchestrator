import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DynamicForm from '../components/DynamicForm';
import { createWorkflow } from '../services/api';

export default function CreateWorkflow() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const workflowSchema = {
    fields: [
      {
        type: 'text',
        name: 'name',
        label: 'Workflow Name',
        required: true,
        placeholder: 'e.g., Production Deployment'
      },
      {
        type: 'textarea',
        name: 'context',
        label: 'Context (JSON)',
        placeholder: '{"environment": "production", "changes": "database migration"}',
        description: 'Optional JSON data for workflow context'
      }
    ]
  };

  const handleCreateWorkflow = async (formData) => {
    setLoading(true);
    try {
      await createWorkflow({
        ...formData,
        context: formData.context ? JSON.parse(formData.context) : {}
      });
      alert('Workflow created successfully!');
      navigate('/');
    } catch (error) {
      console.error('Failed to create workflow:', error);
      alert('Failed to create workflow. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Create New Workflow</h1>
        <p className="text-gray-600 mt-2">Set up a new workflow</p>
      </div>

      <div className="card">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Workflow Details</h2>
        <DynamicForm
          schema={workflowSchema}
          onSubmit={handleCreateWorkflow}
          onCancel={() => navigate('/')}
          submitLabel="Create Workflow"
        />
      </div>
    </div>
  );
}
