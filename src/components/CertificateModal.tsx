import React, { useState } from 'react';
import { jsPDF } from 'jspdf';
import { useInterpreterStore } from '../lib/interpreter';
import { User, School, BookOpen, Download, X } from 'lucide-react';

export const CertificateModal: React.FC = () => {
    const {
        showCertificateModal, closeCertificateModal, calculateScore,
        targetGrid, currentGrid, sourceCode, mode, totalMovements
    } = useInterpreterStore();

    const [form, setForm] = useState({
        name: '',
        surname: '',
        userClass: ''
    });

    const [ipData, setIpData] = useState({ ip: '...', host: window.location.hostname });

    React.useEffect(() => {
        if (showCertificateModal) {
            fetch('https://api.ipify.org?format=json')
                .then(res => res.json())
                .then(data => setIpData(prev => ({ ...prev, ip: data.ip })))
                .catch(() => setIpData(prev => ({ ...prev, ip: 'N/A' })));
        }
    }, [showCertificateModal]);

    if (!showCertificateModal) return null;

    const score = calculateScore();
    const totalPossible = targetGrid ? targetGrid.length : 0;


    const handleGeneratePDF = () => {
        if (!form.name || !form.surname || !form.userClass) {
            alert('Per favore, compila tutti i campi.');
            return;
        }

        const doc = new jsPDF();
        const now = new Date();
        const dateStr = now.toLocaleDateString('it-IT') + ' ' + now.toLocaleTimeString('it-IT');

        // Page 1: Certificate
        doc.setFillColor(30, 30, 30);
        doc.rect(0, 0, 210, 297, 'F');

        // Border
        doc.setDrawColor(59, 130, 246);
        doc.setLineWidth(2);
        doc.rect(10, 10, 190, 277);

        // Header
        doc.setTextColor(59, 130, 246);
        doc.setFontSize(32);
        doc.text("CERTIFICATO DI SFIDA", 105, 50, { align: 'center' });

        doc.setTextColor(200, 200, 200);
        doc.setFontSize(16);
        doc.text("Si attesta che lo studente", 105, 75, { align: 'center' });

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(28);
        doc.text(`${form.name.toUpperCase()} ${form.surname.toUpperCase()}`, 105, 95, { align: 'center' });

        doc.setTextColor(200, 200, 200);
        doc.setFontSize(16);
        doc.text(`Classe: ${form.userClass}`, 105, 110, { align: 'center' });

        doc.setDrawColor(100, 100, 100);
        doc.line(40, 125, 170, 125);

        doc.setFontSize(18);
        doc.text(`Ha completato la prova in modalità ${mode}`, 105, 145, { align: 'center' });

        // Score Section
        doc.setFillColor(40, 40, 40);
        doc.roundedRect(40, 160, 130, 60, 5, 5, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(14);
        doc.text("PUNTEGGIO", 105, 175, { align: 'center' });

        doc.setTextColor(59, 130, 246);
        doc.setFontSize(36);
        doc.text(`${score} `, 105, 195, { align: 'center' });

        doc.setTextColor(150, 150, 150);
        doc.setFontSize(12);
        doc.text(`(Righe completate correttamente)`, 105, 208, { align: 'center' });

        if (mode === 'GRID') {
            doc.setTextColor(200, 200, 200);
            doc.setFontSize(14);
            doc.text(`Movimenti Totali: ${totalMovements}`, 105, 230, { align: 'center' });
        }

        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(`Generato il: ${dateStr}`, 105, 270, { align: 'center' });
        doc.setFontSize(8);
        doc.text(`IP: ${ipData.ip} | Host: ${ipData.host}`, 105, 275, { align: 'center' });
        doc.setFontSize(10);
        doc.text("CCLA - Corso Codifica Linguaggio Automatico", 105, 282, { align: 'center' });

        // Page 2: Evidence
        doc.addPage();
        doc.setFillColor(30, 30, 30);
        doc.rect(0, 0, 210, 297, 'F');

        doc.setTextColor(59, 130, 246);
        doc.setFontSize(22);
        doc.text("RIEPILOGO PROVA", 105, 25, { align: 'center' });

        // Grids Rendering
        const drawGrid = (grid: any, startX: number, startY: number, title: string) => {
            if (!grid) return;
            doc.setTextColor(200, 200, 200);
            doc.setFontSize(12);
            doc.text(title, startX, startY - 5);

            const rows = grid.length;
            const cols = grid[0].length;
            const cellSize = Math.min(6, 120 / cols);

            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    const cell = grid[r][c];
                    if (cell.color === 'R') doc.setFillColor(239, 68, 68);
                    else if (cell.color === 'G') doc.setFillColor(34, 197, 94);
                    else if (cell.color === 'B') doc.setFillColor(59, 130, 246);
                    else doc.setFillColor(60, 60, 60);

                    doc.rect(startX + c * cellSize, startY + r * cellSize, cellSize, cellSize, 'F');
                    doc.setDrawColor(40, 40, 40);
                    doc.rect(startX + c * cellSize, startY + r * cellSize, cellSize, cellSize, 'S');
                }
            }
            return startY + (rows * cellSize) + 20;
        };

        let currentY = 45;
        currentY = drawGrid(targetGrid, 20, currentY, "OBIETTIVO (Target)") || 45;

        // Ensure Result is drawn below Target on Page 2
        drawGrid(currentGrid, 20, currentY, "RISULTATO OTTENUTO (Result)");

        // Page 3: Source Code
        doc.addPage();
        doc.setFillColor(30, 30, 30);
        doc.rect(0, 0, 210, 297, 'F');

        doc.setTextColor(59, 130, 246);
        doc.setFontSize(22);
        doc.text("PROGRAMMA SVOLTO", 105, 25, { align: 'center' });

        doc.setFillColor(20, 20, 20);
        doc.rect(15, 40, 180, 230, 'F');
        doc.setTextColor(150, 255, 150);
        doc.setFont('courier', 'normal');
        doc.setFontSize(9);

        const codeLines = sourceCode.split('\n');
        let codeY = 50;
        for (let i = 0; i < Math.min(codeLines.length, 45); i++) {
            doc.text(codeLines[i], 25, codeY);
            codeY += 5;
        }
        if (codeLines.length > 45) doc.text("... (seguono altre righe)", 25, codeY);

        doc.save(`${form.surname}_${form.name}_certificato.pdf`);
        closeCertificateModal();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-xl p-8 shadow-2xl shadow-blue-500/10">
                <button
                    onClick={closeCertificateModal}
                    className="absolute top-4 right-4 p-2 text-zinc-500 hover:text-white transition-colors"
                >
                    <X size={20} />
                </button>

                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-500/10 rounded-full mb-4">
                        <Download className="text-blue-400" size={32} />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Sfida Completata!</h2>
                    <p className="text-zinc-400">Inserisci i tuoi dati per scaricare il tuo certificato.</p>
                </div>

                <div className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-widest ml-1">Nome</label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" size={18} />
                            <input
                                type="text"
                                value={form.name}
                                onChange={e => setForm({ ...form, name: e.target.value })}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2.5 pl-10 pr-4 text-white focus:outline-none focus:border-blue-500 transition-colors"
                                placeholder="Esempio: Mario"
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-widest ml-1">Cognome</label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" size={18} />
                            <input
                                type="text"
                                value={form.surname}
                                onChange={e => setForm({ ...form, surname: e.target.value })}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2.5 pl-10 pr-4 text-white focus:outline-none focus:border-blue-500 transition-colors"
                                placeholder="Esempio: Rossi"
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-widest ml-1">Classe</label>
                        <div className="relative">
                            <School className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" size={18} />
                            <input
                                type="text"
                                value={form.userClass}
                                onChange={e => setForm({ ...form, userClass: e.target.value })}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2.5 pl-10 pr-4 text-white focus:outline-none focus:border-blue-500 transition-colors"
                                placeholder="Esempio: 1A"
                            />
                        </div>
                    </div>
                </div>

                <div className="mt-8 flex items-center justify-between p-4 bg-zinc-950 rounded-lg border border-zinc-800 mb-6">
                    <div className="flex flex-col">
                        <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Punteggio</span>
                        <span className="text-2xl font-black text-blue-400">{score} <span className="text-zinc-700 text-lg">/ {totalPossible}</span></span>
                    </div>
                    <div className="w-12 h-12 bg-blue-500/5 rounded-full flex items-center justify-center border border-blue-500/20">
                        <BookOpen size={20} className="text-blue-400" />
                    </div>
                </div>

                <button
                    onClick={handleGeneratePDF}
                    className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-900/40 transition-all active:scale-[0.98] flex items-center justify-center gap-3 group"
                >
                    <Download size={20} className="group-hover:translate-y-0.5 transition-transform" />
                    GENERA CERTIFICATO (PDF)
                </button>
            </div>
        </div>
    );
};
