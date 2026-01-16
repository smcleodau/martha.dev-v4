# Martha ML Learning System

**Phase 5: Machine Learning for Agent Selection and Prediction**

This directory contains the machine learning components for the Martha orchestration platform. The ML system provides:

1. **Complexity Estimator** - Predicts issue complexity (1-10) from issue features
2. **Agent Selector** - Predicts which agent will be most successful for an issue
3. **Failure Predictor** - Predicts probability of workflow failure

## Architecture

```
ml/
├── feature_extractors.py   # Extract features from database
├── complexity_estimator.py  # Complexity prediction model
├── agent_selector.py        # Agent selection model
├── failure_predictor.py     # Failure prediction model
├── train.py                 # Training script
├── requirements.txt         # Python dependencies
└── models/                  # Serialized models
    ├── complexity_estimator_v1.json
    ├── agent_selector_v1.json
    └── failure_predictor_v1.json
```

## Setup

### 1. Create Python Virtual Environment

```bash
cd /mnt/data/martha.dev-v4-orchestration/ml
python3 -m venv venv
source venv/bin/activate
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure Database Connection

Set environment variables:

```bash
export DATABASE_URL="postgresql://user:pass@localhost:5432/martha"
export OPENAI_API_KEY="your-api-key"  # For embeddings
```

## Feature Extraction

### Issue Features

- **issue_complexity** - Current complexity rating (1-10)
- **issue_type** - feature, bug, refactor, docs, test
- **issue_title_embedding** - 384-dim sentence embedding from title
- **issue_dependencies_count** - Number of dependencies
- **epic_phase** - Current phase in epic

### Agent Features

- **agent_recent_success_rate** - Success rate over last 30 days
- **agent_avg_duration_ms** - Average completion time
- **agent_specialization_score** - Performance score for issue type
- **agent_current_load** - Number of active issues

### Outcome Labels

- **outcome_success** - Boolean: did workflow complete successfully?
- **outcome_duration_ms** - Total workflow duration
- **outcome_quality_score** - Code quality score (0-100)
- **outcome_test_pass_rate** - Test pass rate (0-100)

## Models

### 1. Complexity Estimator

**Goal:** Predict issue complexity (1-10) from issue features

**Model:** XGBoost Regression
**Target:** R² > 0.7
**Features:**
- Issue title embedding (384 dims)
- Issue type
- Dependencies count
- Epic phase
- Historical complexity for similar issues

**Usage:**
```python
from complexity_estimator import ComplexityEstimator

estimator = ComplexityEstimator.load('models/complexity_estimator_v1.json')
complexity = estimator.predict({
    'issue_title': 'Implement user authentication',
    'issue_type': 'feature',
    'dependencies_count': 2,
    'epic_phase': 'development'
})
print(f"Predicted complexity: {complexity}/10")
```

### 2. Agent Selector

**Goal:** Predict success probability for (agent, issue) pairs

**Model:** Gradient Boosting Classifier
**Target:** AUC > 0.8
**Features:**
- Issue features (as above)
- Agent features (success rate, avg duration, specialization, load)
- Interaction features (agent experience with issue type)

**Usage:**
```python
from agent_selector import AgentSelector

selector = AgentSelector.load('models/agent_selector_v1.json')
agents = ['agent-1', 'agent-2', 'agent-3']
best_agent = selector.select_best_agent(
    issue_type='feature',
    issue_complexity=7,
    available_agents=agents
)
print(f"Selected agent: {best_agent}")
```

### 3. Failure Predictor

**Goal:** Predict workflow failure probability

**Model:** Random Forest Classifier
**Target:** Precision > 0.75
**Features:**
- All issue and agent features
- Current workflow metrics (duration so far, retry count)
- Exception history

**Usage:**
```python
from failure_predictor import FailurePredictor

predictor = FailurePredictor.load('models/failure_predictor_v1.json')
failure_prob = predictor.predict_failure({
    'issue_complexity': 8,
    'agent_id': 'agent-1',
    'current_duration_ms': 3600000,  # 1 hour
    'retry_count': 2,
    'exception_count': 1
})

if failure_prob > 0.3:
    print(f"High failure risk: {failure_prob:.2%}")
    # Send alert or intervene
```

## Training Pipeline

### 1. Extract Training Data

```bash
python feature_extractors.py --output training_data.csv
```

### 2. Train Models

```bash
# Train all models
python train.py --all

# Train specific model
python train.py --model complexity_estimator
python train.py --model agent_selector
python train.py --model failure_predictor
```

### 3. Evaluate Models

```bash
python train.py --evaluate --model agent_selector
```

Output:
```
Agent Selector Evaluation:
  Accuracy: 0.87
  Precision: 0.84
  Recall: 0.82
  F1 Score: 0.83
  AUC: 0.91
```

### 4. Deploy Model

```bash
# Deploy new version
python train.py --deploy --model agent_selector --version v2

# This will:
# 1. Save model to models/agent_selector_v2.json
# 2. Update model_versions table
# 3. Set is_active=true for v2
# 4. Set is_active=false for v1
```

## Integration with TypeScript

### Calling Python Models from TypeScript

Use child_process to call Python scripts:

```typescript
// src/services/MLService.ts
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function predictComplexity(issueTitle: string, issueType: string): Promise<number> {
  const command = `python ml/complexity_estimator.py --title "${issueTitle}" --type "${issueType}"`;
  const { stdout } = await execAsync(command, { cwd: process.cwd() });
  return parseFloat(stdout.trim());
}

export async function selectBestAgent(
  issueType: string,
  issueComplexity: number,
  availableAgents: string[]
): Promise<string> {
  const command = `python ml/agent_selector.py --type "${issueType}" --complexity ${issueComplexity} --agents "${availableAgents.join(',')}"`;
  const { stdout } = await execAsync(command, { cwd: process.cwd() });
  return stdout.trim();
}
```

### Alternative: REST API

For better performance, run Python as a FastAPI service:

```python
# ml/api.py
from fastapi import FastAPI
from complexity_estimator import ComplexityEstimator
from agent_selector import AgentSelector

app = FastAPI()

complexity_model = ComplexityEstimator.load('models/complexity_estimator_v1.json')
agent_model = AgentSelector.load('models/agent_selector_v1.json')

@app.post('/predict/complexity')
def predict_complexity(issue_title: str, issue_type: str):
    complexity = complexity_model.predict({
        'issue_title': issue_title,
        'issue_type': issue_type
    })
    return {'complexity': complexity}

@app.post('/select/agent')
def select_agent(issue_type: str, issue_complexity: int, available_agents: list[str]):
    best_agent = agent_model.select_best_agent(issue_type, issue_complexity, available_agents)
    return {'agent_id': best_agent}
```

Run API:
```bash
uvicorn api:app --host 0.0.0.0 --port 8001
```

TypeScript client:
```typescript
export async function selectBestAgent(
  issueType: string,
  issueComplexity: number,
  availableAgents: string[]
): Promise<string> {
  const response = await fetch('http://localhost:8001/select/agent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ issue_type: issueType, issue_complexity: issueComplexity, available_agents: availableAgents }),
  });
  const data = await response.json();
  return data.agent_id;
}
```

## Continuous Retraining

### Retraining Schedule

Models should be retrained:
- **Daily** - if >100 new samples since last training
- **Weekly** - if >50 new samples since last training
- **On demand** - via manual trigger

### LearningSystemWorkflow (Temporal)

Temporal workflow runs daily to check for retraining:

```typescript
// src/workflows/LearningSystemWorkflow.ts
export async function LearningSystemWorkflow() {
  while (true) {
    // Check if retraining needed
    const newSamples = await proxyActivities<typeof activities>({
      startToCloseTimeout: '10 minutes',
    }).checkNewSamples();

    if (newSamples > 100) {
      // Trigger retraining
      await proxyActivities<typeof activities>({
        startToCloseTimeout: '2 hours',
      }).retrainModels(['complexity_estimator', 'agent_selector', 'failure_predictor']);
    }

    // Wait 24 hours
    await sleep(24 * 60 * 60 * 1000);
  }
}
```

## Performance Monitoring

### Model Drift Detection

Track prediction accuracy over time:

```sql
-- Check agent selector accuracy over last 7 days
SELECT
  DATE(lf.completed_at) AS date,
  COUNT(*) AS total_predictions,
  AVG(CASE WHEN lf.predicted_success_probability > 0.5 AND lf.outcome_success THEN 1
           WHEN lf.predicted_success_probability <= 0.5 AND NOT lf.outcome_success THEN 1
           ELSE 0 END) AS accuracy
FROM learning_feedback lf
WHERE lf.completed_at > NOW() - INTERVAL '7 days'
  AND lf.predicted_success_probability IS NOT NULL
GROUP BY DATE(lf.completed_at)
ORDER BY date DESC;
```

If accuracy drops below threshold (e.g., 0.75), trigger retraining.

## Next Steps

1. **Implement feature_extractors.py** - Extract features from PostgreSQL
2. **Implement complexity_estimator.py** - Train XGBoost model
3. **Implement agent_selector.py** - Train gradient boosting model
4. **Implement failure_predictor.py** - Train random forest model
5. **Create train.py** - Orchestrate training pipeline
6. **Integrate with Temporal** - Call ML models from activities
7. **Set up continuous retraining** - LearningSystemWorkflow

## Resources

- XGBoost: https://xgboost.readthedocs.io/
- scikit-learn: https://scikit-learn.org/
- Sentence Transformers (embeddings): https://www.sbert.net/
- PostgreSQL ML: https://postgresml.org/
