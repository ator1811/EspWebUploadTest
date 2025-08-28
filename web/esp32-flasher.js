class ESP32Flasher {
    constructor() {
        this.port = null;
        this.reader = null;
        this.writer = null;
    }

    async connect() {
        try {
            this.port = await navigator.serial.requestPort();
            await this.port.open({ baudRate: 115200 });
            
            this.reader = this.port.readable.getReader();
            this.writer = this.port.writable.getWriter();
            
            return true;
        } catch (error) {
            console.error('Connection failed:', error);
            return false;
        }
    }

    async disconnect() {
        if (this.reader) {
            await this.reader.cancel();
            this.reader = null;
        }
        if (this.writer) {
            await this.writer.close();
            this.writer = null;
        }
        if (this.port) {
            await this.port.close();
            this.port = null;
        }
    }

    async enterBootloader() {
        // ESP32 boot sequence: assert GPIO0 low, reset, release GPIO0
        // This is hardware-dependent and may need adjustment
        const resetCommand = new Uint8Array([0xC0, 0x00, 0x08, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0xC0]);
        await this.writer.write(resetCommand);
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    async flashFirmware(firmwareFiles, progressCallback) {
        try {
            await this.enterBootloader();
            
            let totalSize = 0;
            let currentSize = 0;
            
            // Calculate total size
            for (const file of firmwareFiles) {
                totalSize += file.data.byteLength;
            }
            
            // Flash each file
            for (const file of firmwareFiles) {
                await this.flashFile(file.offset, file.data, (progress) => {
                    const overallProgress = (currentSize + (file.data.byteLength * progress)) / totalSize;
                    progressCallback(overallProgress * 100, `Flashing ${file.name}`);
                });
                currentSize += file.data.byteLength;
            }
            
            progressCallback(100, 'Flashing complete!');
            return true;
            
        } catch (error) {
            console.error('Flashing failed:', error);
            throw error;
        }
    }

    async flashFile(offset, data, progressCallback) {
        // Simplified ESP32 flashing protocol
        // In a real implementation, you'd need to implement the full ESP32 bootloader protocol
        const chunkSize = 4096;
        const chunks = Math.ceil(data.byteLength / chunkSize);
        
        for (let i = 0; i < chunks; i++) {
            const start = i * chunkSize;
            const end = Math.min(start + chunkSize, data.byteLength);
            const chunk = data.slice(start, end);
            
            // Send chunk (simplified - real implementation needs proper ESP32 commands)
            await this.writer.write(chunk);
            await new Promise(resolve => setTimeout(resolve, 10));
            
            progressCallback((i + 1) / chunks);
        }
    }
}