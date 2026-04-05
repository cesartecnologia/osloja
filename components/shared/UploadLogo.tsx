'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { UploadCloud } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFeedback } from '@/components/providers/FeedbackProvider';

interface UploadLogoProps {
  currentUrl?: string;
  onUploaded: (url: string) => void;
}

const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

export function UploadLogo({ currentUrl, onUploaded }: UploadLogoProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { notify } = useFeedback();
  const [preview, setPreview] = useState(currentUrl || '');
  const [loading, setLoading] = useState(false);

  async function handleFile(file: File) {
    if (!cloudName || !uploadPreset) {
      notify({
        title: 'Cloudinary não configurado',
        description: 'Preencha NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME e NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET.',
        variant: 'error'
      });
      return;
    }

    setLoading(true);
    const form = new FormData();
    form.append('file', file);
    form.append('upload_preset', uploadPreset);
    form.append('folder', 'os-assistencia/logo');

    try {
      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: form
      });

      const payload = await response.json();

      if (!response.ok || !payload?.secure_url) {
        throw new Error(payload?.error?.message || 'Não foi possível enviar a imagem para o Cloudinary.');
      }

      setPreview(payload.secure_url);
      onUploaded(payload.secure_url);
      notify({ title: 'Logo enviada', description: 'A logo foi carregada com sucesso.', variant: 'success' });
    } catch (error) {
      notify({
        title: 'Falha ao enviar a logo',
        description: error instanceof Error ? error.message : 'Não foi possível enviar a imagem.',
        variant: 'error'
      });
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-5">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />

      <div className="flex flex-col items-center gap-4 text-center">
        {preview ? (
          <div className="relative h-24 w-40 overflow-hidden rounded-xl border border-gray-200 bg-white">
            <Image src={preview} alt="Logo da empresa" fill className="object-contain p-2" />
          </div>
        ) : (
          <div className="rounded-xl bg-white p-4 text-red-600">
            <UploadCloud className="h-10 w-10" />
          </div>
        )}

        <div>
          <p className="font-semibold text-ink">Logo da empresa</p>
        </div>

        <Button type="button" onClick={() => inputRef.current?.click()} disabled={loading}>
          {loading ? 'Enviando...' : 'Selecionar imagem'}
        </Button>
      </div>
    </div>
  );
}
