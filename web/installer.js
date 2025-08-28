class FirmwareInstaller {
    constructor() {
        this.flasher = new ESP32Flasher();
        this.manifestUrl = 'https://api.github.com/repos/your-username/your-repo/releases/latest';
        this.setupUI();
    }

    setupUI() {
        if (!('serial' in navigator)) {
            document.getElementById('not-supported').classList.remove('hidden');
            document.getElementById('main-interface').style.display = 'none';
            return;
        }

        document.getElementById('connect-button').addEventListener('click', () => this.connect());
        document.getElementById('install-button').addEventListener('click', () => this.install());
    }

    log(message) {
        const logElement = document.getElementById('log');
        logElement.innerHTML += message + '\n';
        logElement.scrollTop = logElement.scrollHeight;
    }

    async connect() {
        this.log('Connecting to device...');
        
        if (await this.flasher.connect()) {
            this.log('Connected successfully!');
            document.getElementById('connect-button').textContent = 'Connected';
            document.getElementById('connect-button').disabled = true;
            document.getElementById('install-button').classList.remove('hidden');
        } else {
            this.log('Connection failed!');
        }
    }

    async install() {
        try {
            document.getElementById('progress-section').classList.remove('hidden');
            this.log('Downloading firmware...');
            
            // Fetch latest release info
            const release = await fetch(this.manifestUrl).then(r => r.json());
            const firmwareFiles = [];
            
            // Download manifest
            const manifestAsset = release.assets.find(asset => asset.name === 'manifest.json');
            const manifest = await fetch(manifestAsset.browser_download_url).then(r => r.json());
            
            // Download firmware files
            for (const part of manifest.builds[0].parts) {
                const asset = release.assets.find(asset => asset.name === part.path);
                const response = await fetch(asset.browser_download_url);
                const data = await response.arrayBuffer();
                
                firmwareFiles.push({
                    name: part.path,
                    offset: part.offset,
                    data: new Uint8Array(data)
                });
            }
            
            this.log('Starting flash process...');
            
            await this.flasher.flashFirmware(firmwareFiles, (progress, status) => {
                document.getElementById('progress-bar').style.width = progress + '%';
                document.getElementById('status-text').textContent = status;
                this.log(`Progress: ${Math.round(progress)}% - ${status}`);
            });
            
            this.log('Firmware installed successfully!');
            
        } catch (error) {
            this.log(`Installation failed: ${error.message}`);
        }
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    new FirmwareInstaller();
});