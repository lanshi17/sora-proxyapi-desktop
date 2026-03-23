import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

import { modelCatalog } from '../../src/features/models/model-capabilities';

describe('model capability catalog', () => {
  it('defines visible model capability entries for current and future models', () => {
    expect(modelCatalog['sora-2']).toBeDefined();
    expect(modelCatalog['sora-2-pro']).toBeDefined();
    expect(modelCatalog['veo']).toBeDefined();
    expect(modelCatalog['seedance']).toBeDefined();
  });
});

describe('macOS build configuration', () => {
  it('tauri.conf.json should be configured to build macOS bundles', () => {
    const tauriConfPath = path.join(process.cwd(), 'src-tauri', 'tauri.conf.json');
    const tauriConf = JSON.parse(fs.readFileSync(tauriConfPath, 'utf8'));

    expect(tauriConf.bundle).toBeDefined();
    expect(tauriConf.bundle.active).toBe(true);
    expect(
      tauriConf.bundle.targets === 'all' || 
      (Array.isArray(tauriConf.bundle.targets) && tauriConf.bundle.targets.includes('app'))
    ).toBe(true);
  });

  it('package.json should have a build:macos script', () => {
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

    expect(packageJson.scripts['build:macos']).toBeDefined();
    expect(packageJson.scripts['build:macos']).toContain('scripts/build-macos-app.sh');
  });

  it('scripts/build-macos-app.sh should exist', () => {
    const scriptPath = path.join(process.cwd(), 'scripts', 'build-macos-app.sh');
    
    expect(fs.existsSync(scriptPath)).toBe(true);
    
    const scriptContent = fs.readFileSync(scriptPath, 'utf8');
    expect(scriptContent).toContain('#!/bin/bash');
    expect(scriptContent).toContain('cargo build');
  });
});
