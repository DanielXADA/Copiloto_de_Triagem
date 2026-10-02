export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      agendamentos: {
        Row: {
          id: string;
          clinica_id: string;
          paciente_id: string | null;
          paciente_nome: string;
          data_hora: string;
          duracao_minutos: number;
          tipo: string;
          area: string;
          status: "Confirmado" | "Aguardando" | "Cancelado" | "Concluido";
          observacoes: string | null;
          teleconsulta_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string | undefined;
          clinica_id: string;
          paciente_id?: string | null | undefined;
          paciente_nome: string;
          data_hora: string;
          duracao_minutos?: number | undefined;
          tipo?: string | undefined;
          area?: string | undefined;
          status?: "Confirmado" | "Aguardando" | "Cancelado" | "Concluido" | undefined;
          observacoes?: string | null | undefined;
          teleconsulta_url?: string | null | undefined;
          created_at?: string | undefined;
          updated_at?: string | undefined;
        };
        Update: {
          id?: string | undefined;
          clinica_id?: string | undefined;
          paciente_id?: string | null | undefined;
          paciente_nome?: string | undefined;
          data_hora?: string | undefined;
          duracao_minutos?: number | undefined;
          tipo?: string | undefined;
          area?: string | undefined;
          status?: "Confirmado" | "Aguardando" | "Cancelado" | "Concluido" | undefined;
          observacoes?: string | null | undefined;
          teleconsulta_url?: string | null | undefined;
          created_at?: string | undefined;
          updated_at?: string | undefined;
        };
        Relationships: [];
      };
      pacientes: {
        Row: {
          id: string;
          clinica_id: string;
          name: string;
          age: number;
          cpf: string;
          phone: string | null;
          email: string | null;
          plan: string | null;
          last_visit: string | null;
          status: string;
          area: string | null;
          conditions: string[] | null;
          allergies: string[] | null;
          medications: string[] | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string | undefined;
          clinica_id?: string | undefined;
          name: string;
          age?: number | undefined;
          cpf: string;
          phone?: string | null | undefined;
          email?: string | null | undefined;
          plan?: string | null | undefined;
          last_visit?: string | null | undefined;
          status?: string | undefined;
          area?: string | null | undefined;
          conditions?: string[] | null | undefined;
          allergies?: string[] | null | undefined;
          medications?: string[] | null | undefined;
          created_at?: string | null | undefined;
          updated_at?: string | null | undefined;
        };
        Update: {
          id?: string | undefined;
          clinica_id?: string | undefined;
          name?: string | undefined;
          age?: number | undefined;
          cpf?: string | undefined;
          phone?: string | null | undefined;
          email?: string | null | undefined;
          plan?: string | null | undefined;
          last_visit?: string | null | undefined;
          status?: string | undefined;
          area?: string | null | undefined;
          conditions?: string[] | null | undefined;
          allergies?: string[] | null | undefined;
          medications?: string[] | null | undefined;
          created_at?: string | null | undefined;
          updated_at?: string | null | undefined;
        };
        Relationships: [];
      };
      triagens: {
        Row: {
          id: string;
          clinica_id: string;
          patient: string;
          patient_id: string | null;
          reason: string;
          status: string;
          progress: number;
          priority: string;
          started: string | null;
          channel: string;
          created_at: string | null;
        };
        Insert: {
          id?: string | undefined;
          clinica_id?: string | undefined;
          patient: string;
          patient_id?: string | null | undefined;
          reason: string;
          status?: string | undefined;
          progress?: number | undefined;
          priority?: string | undefined;
          started?: string | null | undefined;
          channel?: string | undefined;
          created_at?: string | null | undefined;
        };
        Update: {
          id?: string | undefined;
          clinica_id?: string | undefined;
          patient?: string | undefined;
          patient_id?: string | null | undefined;
          reason?: string | undefined;
          status?: string | undefined;
          progress?: number | undefined;
          priority?: string | undefined;
          started?: string | null | undefined;
          channel?: string | undefined;
          created_at?: string | null | undefined;
        };
        Relationships: [];
      };
      dossies: {
        Row: {
          id: string;
          clinica_id: string;
          patient: string;
          patient_id: string | null;
          age: number;
          area: string;
          created_at: string | null;
          duration: string | null;
          chief_complaint: string;
          history: string;
          symptoms: Json | null;
          red_flags: string[] | null;
          suggestions: string[] | null;
        };
        Insert: {
          id?: string | undefined;
          clinica_id?: string | undefined;
          patient: string;
          patient_id?: string | null | undefined;
          age?: number | undefined;
          area?: string | undefined;
          created_at?: string | null | undefined;
          duration?: string | null | undefined;
          chief_complaint: string;
          history: string;
          symptoms?: Json | null | undefined;
          red_flags?: string[] | null | undefined;
          suggestions?: string[] | null | undefined;
        };
        Update: {
          id?: string | undefined;
          clinica_id?: string | undefined;
          patient?: string | undefined;
          patient_id?: string | null | undefined;
          age?: number | undefined;
          area?: string | undefined;
          created_at?: string | null | undefined;
          duration?: string | null | undefined;
          chief_complaint?: string | undefined;
          history?: string | undefined;
          symptoms?: Json | null | undefined;
          red_flags?: string[] | null | undefined;
          suggestions?: string[] | null | undefined;
        };
        Relationships: [];
      };
      clinicas: {
        Row: {
          id: string;
          nome: string;
          cnpj: string | null;
          razao_social: string | null;
          slug: string | null;
          telefone: string | null;
          email_contato: string | null;
          configuracoes_triagem: Json;
          status: string;
          plano: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string | undefined;
          nome: string;
          cnpj?: string | null | undefined;
          razao_social?: string | null | undefined;
          slug?: string | null | undefined;
          telefone?: string | null | undefined;
          email_contato?: string | null | undefined;
          configuracoes_triagem?: Json | undefined;
          status?: string | undefined;
          plano?: string | undefined;
          created_at?: string | undefined;
          updated_at?: string | undefined;
        };
        Update: {
          id?: string | undefined;
          nome?: string | undefined;
          cnpj?: string | null | undefined;
          razao_social?: string | null | undefined;
          slug?: string | null | undefined;
          telefone?: string | null | undefined;
          email_contato?: string | null | undefined;
          configuracoes_triagem?: Json | undefined;
          status?: string | undefined;
          plano?: string | undefined;
          created_at?: string | undefined;
          updated_at?: string | undefined;
        };
        Relationships: [];
      };
      perfis_usuarios: {
        Row: {
          id: string;
          nome: string;
          email: string | null;
          telefone: string | null;
          crm: string | null;
          tipo_perfil: "admin_sistema" | "medico" | "recepcao";
          ativo: boolean;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          nome: string;
          email?: string | null | undefined;
          telefone?: string | null | undefined;
          crm?: string | null | undefined;
          tipo_perfil?: "admin_sistema" | "medico" | "recepcao" | undefined;
          ativo?: boolean | undefined;
          avatar_url?: string | null | undefined;
          created_at?: string | undefined;
          updated_at?: string | undefined;
        };
        Update: {
          id?: string | undefined;
          nome?: string | undefined;
          email?: string | null | undefined;
          telefone?: string | null | undefined;
          crm?: string | null | undefined;
          tipo_perfil?: "admin_sistema" | "medico" | "recepcao" | undefined;
          ativo?: boolean | undefined;
          avatar_url?: string | null | undefined;
          created_at?: string | undefined;
          updated_at?: string | undefined;
        };
        Relationships: [];
      };
      vinculos_clinica: {
        Row: {
          id: string;
          usuario_id: string;
          clinica_id: string;
          papel: "admin_clinica" | "medico" | "recepcao";
          ativo: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string | undefined;
          usuario_id: string;
          clinica_id: string;
          papel?: "admin_clinica" | "medico" | "recepcao" | undefined;
          ativo?: boolean | undefined;
          created_at?: string | undefined;
          updated_at?: string | undefined;
        };
        Update: {
          id?: string | undefined;
          usuario_id?: string | undefined;
          clinica_id?: string | undefined;
          papel?: "admin_clinica" | "medico" | "recepcao" | undefined;
          ativo?: boolean | undefined;
          created_at?: string | undefined;
          updated_at?: string | undefined;
        };
        Relationships: [];
      };
      perfis: {
        Row: {
          id: string;
          nome_completo: string | null;
          avatar_url: string | null;
          criado_em: string | null;
        };
        Insert: {
          id: string;
          nome_completo?: string | null | undefined;
          avatar_url?: string | null | undefined;
          criado_em?: string | null | undefined;
        };
        Update: {
          id?: string | undefined;
          nome_completo?: string | null | undefined;
          avatar_url?: string | null | undefined;
          criado_em?: string | null | undefined;
        };
        Relationships: [];
      };
      membros_clinica: {
        Row: {
          id: string;
          clinica_id: string;
          usuario_id: string;
          cargo: "admin_geral" | "admin_clinica" | "medico" | "recepcionista";
          criado_em: string | null;
        };
        Insert: {
          id?: string | undefined;
          clinica_id: string;
          usuario_id: string;
          cargo?: "admin_geral" | "admin_clinica" | "medico" | "recepcionista" | undefined;
          criado_em?: string | null | undefined;
        };
        Update: {
          id?: string | undefined;
          clinica_id?: string | undefined;
          usuario_id?: string | undefined;
          cargo?: "admin_geral" | "admin_clinica" | "medico" | "recepcionista" | undefined;
          criado_em?: string | null | undefined;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
