
# SteriTrack - System Diagrams

## 1. Use Case Diagram
Diagram ini menggambarkan interaksi antara Aktor (User) dengan Sistem.

```mermaid
usecaseDiagram
    actor "Perawat (Nurse)" as Nurse
    actor "Staf CSSD" as CSSD
    actor "Admin" as Admin

    package "SteriTrack System" {
        usecase "Login" as UC1
        usecase "Scan QR Unit / Pasien" as UC2
        usecase "Request Instrumen" as UC3
        usecase "Kembalikan Instrumen Kotor (Return)" as UC4
        
        usecase "Terima Barang Kotor (Collection)" as UC5
        usecase "Cuci & Dekontaminasi" as UC6
        usecase "Packing & Labeling" as UC7
        usecase "Sterilisasi (Autoclave)" as UC8
        usecase "Distribusi ke Unit" as UC9
        
        usecase "Manajemen User" as UC10
        usecase "Manajemen Master Data" as UC11
        usecase "Lihat Laporan" as UC12
    }

    Nurse --> UC1
    Nurse --> UC2
    Nurse --> UC3
    Nurse --> UC4

    CSSD --> UC1
    CSSD --> UC5
    CSSD --> UC6
    CSSD --> UC7
    CSSD --> UC8
    CSSD --> UC9

    Admin --> UC1
    Admin --> UC10
    Admin --> UC11
    Admin --> UC12
```

## 2. Activity Diagram (Siklus Instrumen)
Diagram ini menggambarkan alur kerja siklus hidup instrumen dari kotor hingga steril kembali.

```mermaid
flowchart TD
    %% Nodes
    Start((Mulai))
    End((Selesai))

    subgraph Unit [Unit / Ruangan]
        U1[Instrumen Dipakai]
        U2[Lapor Barang Kotor]
        U3[Terima Barang Steril]
    end

    subgraph CSSD_Area [Area CSSD]
        C1[Collection / Penjemputan]
        C2[Washing / Pencucian]
        C3[Packing / Pengemasan]
        C4[Sterilization / Sterilisasi]
        C5[Storage / Penyimpanan]
        C6[Distribution / Distribusi]
    end

    %% Flow
    Start --> U1
    U1 --> U2
    U2 -- "Notifikasi Pickup" --> C1
    
    C1 -- "Barang masuk kotor" --> C2
    C2 -- "Instrumen Bersih" --> C3
    
    C3 -- "Generate QR Pack" --> C4
    C4 -- "Validasi Batch" --> C5
    
    C5 -- "Request dari Unit" --> C6
    C6 -- "Scan Kirim" --> U3
    
    U3 --> U1
```

## 3. Entity Relationship Diagram (ERD) - Conceptual
Diagram hubungan antar tabel database.

```mermaid
erDiagram
    USERS {
        string id PK
        string username
        string password
        string name
        string role
        string unit_id FK
        boolean is_active
        string phone "New: WhatsApp/Contact"
        text photo_url "New: Profile Picture"
    }

    UNITS {
        string id PK
        string name
        string type
        string qr_code
    }

    INSTRUMENTS {
        string id PK
        string name
        string category
        int total_stock
    }

    UNITS ||--o{ USERS : "has staff"
    UNITS ||--o{ TRANSACTIONS : "source/destination"
    UNITS ||--o{ STERILE_PACKS : "requests/receives"
    
    USERS ||--o{ TRANSACTIONS : "creates/validates"
    
    INSTRUMENTS ||--o{ INSTRUMENT_SETS : "items in"
    INSTRUMENTS ||--o{ TRANSACTION_ITEMS : "logged in"
    INSTRUMENTS ||--o{ INVENTORY_SNAPSHOTS : "stocked in"
    
    TRANSACTIONS ||--|{ TRANSACTION_ITEMS : "contains"
    
    STERILE_PACKS ||--|{ STERILE_PACK_ITEMS : "contains"
    STERILE_PACKS }|--|| STERILIZATION_BATCHES : "processed in"
    
    STERILIZATION_BATCHES ||--|{ STERILIZATION_BATCH_ITEMS : "logs usage"
```
