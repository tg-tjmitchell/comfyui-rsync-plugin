import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";

// Add File Transfer Panel to ComfyUI as a sidebar tab
app.registerExtension({
    name: "Comfy.FileTransferPanel",

    async setup() {
        // Create styles for the sidebar tab
        const style = document.createElement("style");
        style.textContent = `
            .file-transfer-sidebar {
                padding: 10px;
                overflow-y: auto;
                height: 100%;
            }
            .form-group {
                margin-bottom: 10px;
            }
            label {
                display: block;
                margin-bottom: 5px;
                font-size: 0.9em;
            }
            input[type="text"], input[type="number"] {
                width: 100%;
                padding: 5px;
                background-color: var(--comfy-input-bg);
                border: 1px solid var(--border-color);
                color: var(--input-text);
                border-radius: 4px;
                font-size: 0.9em;
            }
            .checkbox-wrapper {
                display: flex;
                align-items: center;
                margin-bottom: 5px;
            }
            .checkbox-wrapper label {
                margin-left: 8px;
                margin-bottom: 0;
                font-size: 0.9em;
            }
            .button-row {
                display: flex;
                justify-content: space-between;
                margin-top: 15px;
            }
            .primary-button {
                padding: 5px 12px;
                background-color: var(--primary-color);
                border: none;
                color: white;
                border-radius: 4px;
                cursor: pointer;
                font-size: 0.9em;
            }
            .primary-button:disabled {
                background-color: #666;
                cursor: not-allowed;
            }
            .output-area {
                margin-top: 15px;
            }
            #transfer-output {
                max-height: 150px;
                overflow: auto;
                background: var(--comfy-input-bg);
                padding: 10px;
                border-radius: 5px;
                font-size: 0.85em;
                white-space: pre-wrap;
                word-break: break-word;
            }
            
            /* Tab styling for within the sidebar */
            .sidebar-tabs {
                width: 100%;
            }
            .sidebar-tab-buttons {
                display: flex;
                border-bottom: 1px solid var(--border-color);
                margin-bottom: 10px;
            }
            .sidebar-tab-button {
                padding: 5px 10px;
                background: transparent;
                border: none;
                border-bottom: 2px solid transparent;
                color: var(--input-text);
                cursor: pointer;
                font-size: 0.9em;
                margin-right: 5px;
            }
            .sidebar-tab-button.active {
                border-bottom: 2px solid var(--primary-color);
                color: var(--primary-color);
            }
            .sidebar-tab-pane {
                display: none;
            }
            .sidebar-tab-pane.active {
                display: block;
            }
        `;
        document.head.appendChild(style);

        // Register the sidebar tab using the official Sidebar Tabs API
        app.extensionManager.registerSidebarTab({
            id: "fileTransfer",
            icon: "pi pi-upload",
            title: "File Transfer",
            tooltip: "Rsync and Rclone utilities",
            type: "custom",
            render: (el) => {
                // Create the container for the sidebar tab content
                const container = document.createElement("div");
                container.className = "comfy-modal-content file-transfer-sidebar";

                // Create tab structure
                container.innerHTML = `
                    <div class="sidebar-tabs">
                        <div class="sidebar-tab-buttons">
                            <button class="sidebar-tab-button active" data-tab="rsync-tab">Rsync</button>
                            <button class="sidebar-tab-button" data-tab="rclone-tab">Rclone</button>
                        </div>
                        
                        <div class="sidebar-tab-content">
                            <!-- Rsync Tab -->
                            <div id="rsync-tab" class="sidebar-tab-pane active">
                                <div class="form-group">
                                    <label for="rsync-source">Source Path:</label>
                                    <input type="text" id="rsync-source" placeholder="Path to source folder or file">
                                </div>
                                <div class="form-group">
                                    <label for="rsync-destination">Destination Path:</label>
                                    <input type="text" id="rsync-destination" placeholder="Path to destination folder">
                                </div>
                                <div class="form-group">
                                    <label for="rsync-flags">Flags:</label>
                                    <input type="text" id="rsync-flags" placeholder="rsync flags" value="-avz">
                                </div>
                                <div class="form-group">
                                    <div class="checkbox-wrapper">
                                        <input type="checkbox" id="rsync-dry-run" checked>
                                        <label for="rsync-dry-run">Dry Run (no actual changes)</label>
                                    </div>
                                </div>
                                <div class="form-group">
                                    <div class="checkbox-wrapper">
                                        <input type="checkbox" id="rsync-wsl">
                                        <label for="rsync-wsl">Use WSL (Windows Subsystem for Linux)</label>
                                    </div>
                                </div>
                                <div class="form-group">
                                    <label for="rsync-timeout">Timeout (seconds):</label>
                                    <input type="number" id="rsync-timeout" min="1" max="3600" value="300">
                                </div>
                                <div class="button-row">
                                    <button id="rsync-run" class="primary-button">Run Rsync</button>
                                </div>
                            </div>
                            
                            <!-- Rclone Tab -->
                            <div id="rclone-tab" class="sidebar-tab-pane">
                                <div class="form-group">
                                    <label for="rclone-source">Source Path:</label>
                                    <input type="text" id="rclone-source" placeholder="Local path or remote:path">
                                </div>
                                <div class="form-group">
                                    <label for="rclone-destination">Destination Path:</label>
                                    <input type="text" id="rclone-destination" placeholder="Local path or remote:path">
                                </div>
                                    <div class="form-group">
                                    <label for="rclone-config">Config File Path (Optional):</label>
                                    <input type="text" id="rclone-config" placeholder="Path to rclone.conf">
                                </div>
                                <div class="form-group">
                                    <label for="rclone-flags">Command & Flags:</label>
                                    <input type="text" id="rclone-flags" placeholder="copy, sync, etc. with flags" value="copy">
                                </div>
                                <div class="form-group">
                                    <div class="checkbox-wrapper">
                                        <input type="checkbox" id="rclone-dry-run" checked>
                                        <label for="rclone-dry-run">Dry Run (no actual changes)</label>
                                    </div>
                                </div>
                                <div class="form-group">
                                    <div class="checkbox-wrapper">
                                        <input type="checkbox" id="rclone-wsl">
                                        <label for="rclone-wsl">Use WSL (Windows Subsystem for Linux)</label>
                                    </div>
                                </div>
                                <div class="form-group">
                                    <label for="rclone-timeout">Timeout (seconds):</label>
                                    <input type="number" id="rclone-timeout" min="1" max="3600" value="300">
                                </div>
                                <div class="button-row">
                                    <button id="rclone-run" class="primary-button">Run Rclone</button>
                                </div>
                            </div>
                        </div>
                        
                        <div class="output-area">
                            <h4>Output:</h4>
                            <pre id="transfer-output">Results will appear here</pre>
                        </div>
                    </div>
                `;

                // Tab switching functionality
                const tabButtons = container.querySelectorAll(".sidebar-tab-button");
                tabButtons.forEach(button => {
                    button.addEventListener("click", () => {
                        // Deactivate all tabs
                        tabButtons.forEach(btn => btn.classList.remove("active"));
                        container.querySelectorAll(".sidebar-tab-pane").forEach(pane => pane.classList.remove("active"));

                        // Activate the clicked tab
                        button.classList.add("active");
                        const tabId = button.dataset.tab;
                        container.querySelector(`#${tabId}`).classList.add("active");
                    });
                });

                // Rsync run handler
                container.querySelector("#rsync-run").addEventListener("click", async () => {
                    const runBtn = container.querySelector("#rsync-run");
                    const outputArea = container.querySelector("#transfer-output");

                    // Gather form data
                    const params = {
                        source: container.querySelector("#rsync-source").value,
                        destination: container.querySelector("#rsync-destination").value,
                        flags: container.querySelector("#rsync-flags").value,
                        dry_run: container.querySelector("#rsync-dry-run").checked,
                        use_wsl: container.querySelector("#rsync-wsl").checked,
                        timeout: parseInt(container.querySelector("#rsync-timeout").value || "300")
                    };

                    if (!params.source || !params.destination) {
                        outputArea.textContent = "Error: Source and destination paths are required.";
                        outputArea.style.color = "#ff8787";
                        return;
                    }

                    // Disable button and show loading
                    runBtn.disabled = true;
                    runBtn.textContent = "Running...";
                    outputArea.textContent = "Running rsync command...";
                    outputArea.style.color = "var(--input-text)";

                    try {
                        const response = await fetch("/rsync/run", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(params)
                        });

                        const result = await response.json();
                        outputArea.textContent = result.output || "No output returned";

                        if (result.success) {
                            outputArea.style.color = "#8bff87";  // Green for success
                        } else {
                            outputArea.style.color = "#ff8787";  // Red for error
                        }
                    } catch (error) {
                        outputArea.textContent = `Error: ${error.message || "Failed to run rsync"}`;
                        outputArea.style.color = "#ff8787";
                    } finally {
                        runBtn.disabled = false;
                        runBtn.textContent = "Run Rsync";
                    }
                });

                // Rclone run handler
                container.querySelector("#rclone-run").addEventListener("click", async () => {
                    const runBtn = container.querySelector("#rclone-run");
                    const outputArea = container.querySelector("#transfer-output");

                    // Gather form data
                    const params = {
                        source: container.querySelector("#rclone-source").value,
                        destination: container.querySelector("#rclone-destination").value,
                        flags: container.querySelector("#rclone-flags").value,
                        dry_run: container.querySelector("#rclone-dry-run").checked,
                        use_wsl: container.querySelector("#rclone-wsl").checked,
                        config_path: container.querySelector("#rclone-config").value,
                        timeout: parseInt(container.querySelector("#rclone-timeout").value || "300")
                    };

                    if (!params.source || !params.destination) {
                        outputArea.textContent = "Error: Source and destination paths are required.";
                        outputArea.style.color = "#ff8787";
                        return;
                    }

                    // Disable button and show loading
                    runBtn.disabled = true;
                    runBtn.textContent = "Running...";
                    outputArea.textContent = "Running rclone command...";
                    outputArea.style.color = "var(--input-text)";

                    try {
                        const response = await fetch("/rclone/run", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(params)
                        });

                        const result = await response.json();
                        outputArea.textContent = result.output || "No output returned";

                        if (result.success) {
                            outputArea.style.color = "#8bff87";  // Green for success
                        } else {
                            outputArea.style.color = "#ff8787";  // Red for error
                        }
                    } catch (error) {
                        outputArea.textContent = `Error: ${error.message || "Failed to run rclone"}`;
                        outputArea.style.color = "#ff8787";
                    } finally {
                        runBtn.disabled = false;
                        runBtn.textContent = "Run Rclone";
                    }
                });

                // Append to the sidebar tab element
                el.appendChild(container);

                // Optional cleanup when the tab is destroyed
                return () => {
                    // No persistent listeners outside container
                };
            }
        });

        // No need for the old extension menu items since we're using a sidebar tab now
        console.log("ComfyUI File Transfer Plugin: Sidebar tab registered successfully");
    }
});
