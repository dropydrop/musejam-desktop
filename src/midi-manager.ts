export class MIDIManager {
    private midiAccess: MIDIAccess | null = null;
    private inputs: MIDIInput[] = [];

    async init(): Promise<void> {
        try {
            this.midiAccess = await navigator.requestMIDIAccess();
            this.midiAccess.onstatechange = () => this.updateInputs();
            this.updateInputs();
            console.log(`✅ MIDI initialisé (${this.inputs.length} périphériques)`);
        } catch (error) {
            console.warn('⚠️ MIDI non disponible:', error);
        }
    }

    private updateInputs(): void {
        if (!this.midiAccess) return;
        const inputs = Array.from(this.midiAccess.inputs.values());
        this.inputs = inputs;
        inputs.forEach(input => {
            input.onmidimessage = null;
            input.onmidimessage = this.handleMIDIMessage.bind(this);
        });
        console.log(`🎹 ${inputs.length} périphérique(s) MIDI connecté(s)`);
        document.dispatchEvent(new CustomEvent('midi-devices-changed', {
            detail: { count: inputs.length }
        }));
    }

    private handleMIDIMessage(event: MIDIMessageEvent): void {
        const data = event.data;
        if (!data) return;
        const [status, note, velocity] = data;
        if (status === 0x90 && velocity > 0) {
            document.dispatchEvent(new CustomEvent('midi-note-on', {
                detail: { note, velocity }
            }));
            return;
        }
        if (status === 0x80 || (status === 0x90 && velocity === 0)) {
            document.dispatchEvent(new CustomEvent('midi-note-off', {
                detail: { note }
            }));
            return;
        }
    }

    getInputs(): MIDIInput[] {
        return this.inputs;
    }
}

export const midi = new MIDIManager();
