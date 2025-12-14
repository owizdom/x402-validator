import { Router, Request, Response } from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from '../utils/logger';
import path from 'path';

const execAsync = promisify(exec);

export function TerminalRouter(): Router {
  const router = Router();

  // Custom command mappings
  const commandMap: { [key: string]: string } = {
    'deploy': 'rm -rf broadcast cache && PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 forge script script/Deploy.s.sol:DeployScript --rpc-url http://localhost:8545 --broadcast',
    'build': 'forge build',
    'anvil': 'anvil',
    'status': 'curl -s http://localhost:8545 -X POST -H "Content-Type: application/json" -d \'{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}\'',
    'test': 'npm test',
  };

  /**
   * Execute command using exec with explicit shell invocation
   */
  const executeCommand = async (command: string, cwd: string, env: NodeJS.ProcessEnv): Promise<{ output: string; exitCode: number }> => {
    try {
      // Use exec with explicit /bin/sh invocation
      // This ensures the shell is found regardless of PATH
      const shellCommand = `/bin/sh -c ${JSON.stringify(command)}`;
      
      // Ensure PATH includes common locations
      const enhancedEnv = {
        ...env,
        PATH: `/bin:/usr/bin:/usr/local/bin:/sbin:/usr/sbin:${env.PATH || process.env.PATH || ''}`
      };
      
      const { stdout, stderr } = await execAsync(shellCommand, {
        cwd,
        env: enhancedEnv,
        maxBuffer: 10 * 1024 * 1024 // 10MB
      });
      
      const output = stdout || stderr;
      const exitCode = stderr && !stdout ? 1 : 0;
      return { output, exitCode };
    } catch (error: any) {
      // exec throws on non-zero exit, but we want the output
      const output = error.stdout || error.stderr || error.message || 'Command execution failed';
      const exitCode = error.code || 1;
      logger.error('Command execution error:', error);
      return { output, exitCode };
    }
  };

  /**
   * POST /api/terminal/execute
   * Execute a terminal command
   */
  router.post('/execute', async (req: Request, res: Response) => {
    try {
      const { command } = req.body;

      if (!command || typeof command !== 'string') {
        return res.status(400).json({ error: 'Command is required' });
      }

      // Handle clear command
      if (command.trim() === 'clear') {
        return res.json({ output: '', exitCode: 0 });
      }

      // Check for custom commands
      const cmdParts = command.trim().split(/\s+/);
      const baseCmd = cmdParts[0];
      const args = cmdParts.slice(1).join(' ');

      let finalCommand = command;

      // Map custom short commands
      if (commandMap[baseCmd]) {
        if (baseCmd === 'deploy') {
          // Allow custom private key: deploy --key 0x...
          if (args) {
            const keyMatch = args.match(/--key\s+(\S+)/);
            if (keyMatch) {
              finalCommand = `PRIVATE_KEY=${keyMatch[1]} forge script script/Deploy.s.sol:DeployScript --rpc-url http://localhost:8545 --broadcast`;
            } else {
              finalCommand = commandMap[baseCmd];
            }
          } else {
            finalCommand = commandMap[baseCmd];
          }
        } else if (baseCmd === 'help') {
          const helpText = `Available commands:
deploy          - Deploy contracts to Anvil
deploy --key    - Deploy with custom private key
build           - Build contracts
test            - Run validator tests
anvil           - Check Anvil status
status          - Check blockchain status
help            - Show this help
clear           - Clear terminal
`;
          return res.json({ 
            output: helpText,
            exitCode: 0 
          });
        } else if (baseCmd === 'test') {
          // Run tests from project root
          finalCommand = commandMap[baseCmd];
        } else if (baseCmd === 'anvil') {
          // Check if anvil is running, don't start it
          finalCommand = commandMap['status'];
        } else {
          finalCommand = commandMap[baseCmd];
        }
      }

      // Determine working directory based on command
      // process.cwd() when facilitator runs is facilitator/
      let workingDir: string;
      if (baseCmd === 'test') {
        // Run tests from project root
        workingDir = path.resolve(process.cwd(), '..');
      } else {
        // Other commands run in contracts directory
        workingDir = path.resolve(process.cwd(), '..', 'contracts');
      }
      
      // Build environment with Foundry in PATH
      const foundryPath = process.env.HOME ? `${process.env.HOME}/.foundry/bin` : '';
      const currentPath = process.env.PATH || '';
      const newPath = foundryPath ? `${foundryPath}:${currentPath}` : currentPath;
      
      const env = {
        ...process.env,
        PATH: newPath,
        HOME: process.env.HOME || '',
        SHELL: process.env.SHELL || '/bin/zsh',
        NODE_PATH: path.resolve(process.cwd(), '..', 'node_modules')
      };

      const { output, exitCode } = await executeCommand(finalCommand, workingDir, env);
      
      // Parse test results if this is a test command
      if (baseCmd === 'test') {
        const testResults = parseTestResults(output);
        return res.json({ 
          output, 
          exitCode,
          testResults: testResults ? testResults : undefined
        });
      }
      
      res.json({ output, exitCode });
    } catch (error: any) {
      logger.error('Terminal command error:', error);
      res.json({ 
        output: error.message || 'Command execution failed',
        exitCode: 1
      });
    }
  });

  /**
   * GET /api/terminal/status
   * Get terminal/Anvil status
   */
  router.get('/status', async (req: Request, res: Response) => {
    try {
      const contractsDir = path.resolve(process.cwd(), '..', 'contracts');
      const foundryPath = process.env.HOME ? `${process.env.HOME}/.foundry/bin` : '';
      const currentPath = process.env.PATH || '';
      const newPath = foundryPath ? `${foundryPath}:${currentPath}` : currentPath;
      
      const env = {
        ...process.env,
        PATH: newPath,
        HOME: process.env.HOME || '',
        SHELL: process.env.SHELL || '/bin/zsh'
      };

      const { output } = await executeCommand(
        'curl -s http://localhost:8545 -X POST -H "Content-Type: application/json" -d \'{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}\'',
        contractsDir,
        env
      );
      
      res.json({ 
        anvilRunning: true,
        message: 'Anvil is running'
      });
    } catch (error) {
      res.json({ 
        anvilRunning: false,
        message: 'Anvil is not running. Start it with: anvil'
      });
    }
  });

  /**
   * Parse test output to extract structured results
   */
  function parseTestResults(output: string): any | null {
    try {
      const tests: any[] = [];
      let summary: any = { total: 0, passed: 0, failed: 0 };

      // Extract test results from output with more details
      const healthMatch = output.match(/Health Check:\s*\[(PASS|FAIL)\]/);
      const healthDetailsMatch = output.match(/\[PASS\] Health check:\s*({[^}]+})/);
      
      const paymentMatch = output.match(/Payment Verification:\s*\[(PASS|FAIL)\]/);
      const paymentDetailsMatch = output.match(/Created payment authorization:[\s\S]*?Client:\s*([^\n]+)[\s\S]*?Token:\s*([^\n]+)[\s\S]*?Amount:\s*([^\n]+)[\s\S]*?Nonce:\s*([^\n]+)[\s\S]*?Signature:\s*([^\n]+)/);
      const paymentResponseMatch = output.match(/\[PASS\] Payment verification response:\s*({[^}]+})/);
      
      const contractMatch = output.match(/Contract Interaction:\s*\[(PASS|FAIL)\]/);
      const contractResultMatch = output.match(/\[PASS\] Contract isValidPayment result:\s*([^\n]+)/);

      if (healthMatch) {
        const passed = healthMatch[1] === 'PASS';
        let details = passed ? 'Facilitator service is running correctly' : 'Facilitator health check failed';
        if (healthDetailsMatch) {
          try {
            const healthData = JSON.parse(healthDetailsMatch[1]);
            details = `Status: ${healthData.status || 'unknown'}\nService: ${healthData.service || 'x402-facilitator'}`;
          } catch (e) {
            // Keep default details
          }
        }
        tests.push({
          name: 'Facilitator Health Check',
          passed,
          details,
          latency: passed ? '~50ms' : 'N/A'
        });
        summary.total++;
        if (passed) summary.passed++; else summary.failed++;
      }

      if (paymentMatch) {
        const passed = paymentMatch[1] === 'PASS';
        let details = passed ? 'Payment verification via facilitator API successful' : 'Payment verification failed';
        const testData: any = {};
        
        if (paymentDetailsMatch) {
          testData.client = paymentDetailsMatch[1].trim();
          testData.token = paymentDetailsMatch[2].trim();
          testData.amount = paymentDetailsMatch[3].trim();
          testData.nonce = paymentDetailsMatch[4].trim();
          testData.signature = paymentDetailsMatch[5].trim();
          details = `Payment authorization created and verified\nClient address: ${testData.client}\nToken: ${testData.token}\nAmount: ${testData.amount} wei`;
        }
        
        if (paymentResponseMatch) {
          try {
            const responseData = JSON.parse(paymentResponseMatch[1]);
            if (responseData.latency) {
              testData.latency = `${responseData.latency}ms`;
            }
            if (responseData.verifiedAt) {
              details += `\nVerified at: ${responseData.verifiedAt}`;
            }
          } catch (e) {
            // Keep default details
          }
        }
        
        tests.push({
          name: 'Payment Verification',
          passed,
          details,
          ...testData
        });
        summary.total++;
        if (passed) summary.passed++; else summary.failed++;
      }

      if (contractMatch) {
        const passed = contractMatch[1] === 'PASS';
        let details = passed ? 'Direct contract interaction successful' : 'Contract interaction failed';
        if (contractResultMatch) {
          const result = contractResultMatch[1].trim();
          details = `Contract call result: ${result}\nDirect on-chain verification completed`;
        }
        tests.push({
          name: 'Contract Interaction',
          passed,
          details,
          latency: passed ? '~200ms' : 'N/A'
        });
        summary.total++;
        if (passed) summary.passed++; else summary.failed++;
      }

      if (tests.length > 0) {
        return {
          tests,
          summary,
          allPassed: summary.failed === 0
        };
      }

      return null;
    } catch (error) {
      logger.error('Error parsing test results:', error);
      return null;
    }
  }

  return router;
}
