import React, { useState, useEffect, useCallback } from 'react';
import { Form, Input, Select, Button, Card, message } from 'antd';
import { fetchModels, ModelInfo } from '../models/model-fetch-client';
import { settingsStore } from './settings-store';
import { AppSettings } from './settings-types';

export interface SettingsFormProps {
  onSettingsSaved?: (settings: AppSettings) => void;
}

export function SettingsForm({ onSettingsSaved }: SettingsFormProps) {
  const [form] = Form.useForm();
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const loadModels = useCallback(async (apiKey: string) => {
    setLoading(true);
    try {
      const fetchedModels = await fetchModels(apiKey);
      setModels(fetchedModels);
    } catch (err) {
      message.error('Failed to fetch models. Please check your API key.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const saved = settingsStore.load();
    form.setFieldsValue(saved);
    if (saved.apiKey) {
      loadModels(saved.apiKey);
    }
  }, [form, loadModels]);

  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const apiKey = e.target.value;
    if (apiKey.length > 10) {
      loadModels(apiKey);
    }
  };

  const handleSubmit = (values: AppSettings) => {
    const settings: AppSettings = {
      ...values,
      availableModels: models.map(m => m.id)
    };
    settingsStore.save(settings);
    onSettingsSaved?.(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    message.success('Settings saved successfully');
  };

  return (
    <Card title="Workspace Settings">
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        autoComplete="off"
      >
        <Form.Item
          label="API Key"
          name="apiKey"
          rules={[{ required: true, message: 'Please enter your API key' }]}
        >
          <Input.Password
            placeholder="Enter your API key"
            onChange={handleApiKeyChange}
          />
        </Form.Item>

        <Form.Item
          label="Model"
          name="model"
          rules={[{ required: true, message: 'Please select a model' }]}
        >
          <Select
            placeholder="Select a model"
            loading={loading}
            options={models.map(m => ({
              label: m.id,
              value: m.id
            }))}
          />
        </Form.Item>

        <Form.Item>
          <Button type="primary" htmlType="submit" block>
            {saved ? 'Saved!' : 'Save Settings'}
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
}
