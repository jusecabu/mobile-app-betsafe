// ============================================================
// base.repository.ts
// Clase base con helper de manejo de errores Supabase.
// Todos los repositorios la extienden.
// ============================================================

import { PostgrestError } from '@supabase/supabase-js';

export class RepositoryError extends Error {
    constructor(
        message: string,
        public readonly code?: string,
        public readonly details?: string,
    ) {
        super(message);
        this.name = 'RepositoryError';
    }
}

export function handlePostgrestError(error: PostgrestError): never {
    // Códigos Postgres comunes con mensajes amigables
    const messages: Record<string, string> = {
        '23505': 'Ya existe un registro con ese valor único',
        '23503': 'La referencia a otro registro no existe',
        '23514': 'El valor no cumple las restricciones',
        '42501': 'No tienes permiso para realizar esta operación',
        PGRST116: 'Registro no encontrado',
    };

    const friendly = messages[error.code] ?? error.message;
    throw new RepositoryError(friendly, error.code, error.details ?? undefined);
}
