from langchain_openai import ChatOpenAI
from langgraph_supervisor import create_supervisor, create_handoff_tool
from langgraph.prebuilt import create_react_agent
from langgraph.checkpoint.memory import InMemorySaver
from langgraph.store.memory import InMemoryStore
from pydantic import BaseModel, Field
from typing import List, Optional
import json
import pprint

# Pydantic models for structured outputs
class PatientIdentification(BaseModel):
    name: Optional[str] = Field(description="Patient's full name")
    age: Optional[int] = Field(description="Patient's age")
    identification_number: Optional[str] = Field(description="Patient's ID number")
    gender: Optional[str] = Field(description="Patient's gender")
    phone: Optional[str] = Field(description="Patient's phone number")
    address: Optional[str] = Field(description="Patient's address")

class MedicalExtraction(BaseModel):
    symptoms: List[str] = Field(description="List of symptoms mentioned by the patient")
    patient_info: PatientIdentification = Field(description="Patient identification information")
    reason_for_consultation: str = Field(description="Brief reason for the medical consultation")

class DiagnosisResponse(BaseModel):
    diagnosis: str = Field(description="Medical diagnosis based on symptoms")
    treatment_plan: str = Field(description="Recommended treatment plan")
    recommendations: str = Field(description="Additional medical recommendations")

# Initialize the GPT-4o-mini model
model = ChatOpenAI(model="gpt-4o-mini", temperature=0.3)

def extract_medical_information(text: str) -> MedicalExtraction:
    """Extract medical information from free text input using structured output."""
    try:
        # Use the model with structured output
        structured_model = model.with_structured_output(MedicalExtraction)
        
        extraction_prompt = f"""
        Analyze the following medical text and extract structured information.
        
        Text: {text}
        
        Extract:
        1. All symptoms mentioned by the patient
        2. Patient identification details (name, age, ID, gender, phone, address if mentioned)
        3. Brief reason for the medical consultation
        
        IMPORTANT: 
        - Always include all patient_info fields even if not mentioned in the text
        - Use "Not provided" for missing patient information except for gender
        - For age, use null if not provided (not a string)
        - For gender: If not explicitly mentioned, infer it from the patient's name (e.g., "John" -> "Male", "Maria" -> "Female"). Only use "Not provided" if the name is ambiguous or not given
        """
        
        result = structured_model.invoke(extraction_prompt)
        return result
    except Exception as e:
        # Return a default structure in case of error
        return MedicalExtraction(
            symptoms=[f"Error extracting symptoms: {str(e)}"],
            patient_info=PatientIdentification(),
            reason_for_consultation=f"Error: {str(e)}"
        )

def generate_diagnosis(medical_extraction: MedicalExtraction) -> DiagnosisResponse:
    """Generate diagnosis, treatment plan, and recommendations based on structured medical information."""
    try:
        # Use the model with structured output
        structured_model = model.with_structured_output(DiagnosisResponse)
        
        diagnosis_prompt = f"""
        Based on the following structured medical information, provide a medical diagnosis, treatment plan, and recommendations.
        
        Symptoms: {', '.join(medical_extraction.symptoms)}
        Patient Age: {medical_extraction.patient_info.age or 'Not provided'}
        Patient Gender: {medical_extraction.patient_info.gender or 'Not provided'}
        Reason for consultation: {medical_extraction.reason_for_consultation}
        
        Provide a professional medical assessment based on this information.
        Note: This is for educational purposes only and should not replace professional medical advice.
        """
        
        result = structured_model.invoke(diagnosis_prompt)
        return result
    except Exception as e:
        # Return a default structure in case of error
        return DiagnosisResponse(
            diagnosis=f"Error generating diagnosis: {str(e)}",
            treatment_plan="Unable to generate treatment plan due to error",
            recommendations="Please consult with a medical professional"
        )

def validate_medical_extraction(extraction: MedicalExtraction) -> str:
    """Validate and format extracted medical information."""
    try:
        # Convert to dictionary for JSON serialization
        return json.dumps(extraction.model_dump(), indent=2)
    except Exception as e:
        return f"Validation error: {str(e)}"

# Create medical agent with specialized tools
medical_agent = create_react_agent(
    model=model,
    tools=[extract_medical_information, generate_diagnosis, validate_medical_extraction],
    name="medical_expert",
    prompt="""You are a medical information extraction expert. You can:
    1. Extract structured medical information from free text using Pydantic models
    2. Generate medical diagnoses, treatment plans, and recommendations using structured output
    3. Validate medical extraction data
    
    WORKFLOW: When processing medical text, always follow this sequence:
    1. First, use extract_medical_information to extract structured data from the text (returns MedicalExtraction object)
    2. Present the extracted information clearly to the user using the structured data
    3. Then, use generate_diagnosis with the extracted data to provide medical analysis (returns DiagnosisResponse object)
    
    OUTPUT FORMAT: Structure your response as follows:
    
    ## EXTRACTED INFORMATION
    **Patient Information:**
    - Name: [extraction.patient_info.name or "Not provided"]
    - Age: [extraction.patient_info.age or "Not provided"] 
    - ID: [extraction.patient_info.identification_number or "Not provided"]
    - Gender: [extraction.patient_info.gender or "Not provided"]
    - Phone: [extraction.patient_info.phone or "Not provided"]
    - Address: [extraction.patient_info.address or "Not provided"]
    
    **Symptoms:**
    - [List all symptoms from extraction.symptoms]
    
    **Reason for Consultation:**
    - [extraction.reason_for_consultation]
    
    ## MEDICAL ANALYSIS
    **DIAGNOSIS:**
    [diagnosis_result.diagnosis]
    
    **TREATMENT PLAN:**
    [diagnosis_result.treatment_plan]
    
    **RECOMMENDATIONS:**
    [diagnosis_result.recommendations]
    
    IMPORTANT: 
    - Always show the extracted information FIRST, then proceed with the medical analysis
    - ONLY display the 6 patient information fields: name, age, identification_number, gender, phone, address
    - Use the structured output objects directly - don't parse JSON strings
    - Use "Not provided" for missing patient information fields, except for gender which should be inferred from the name when possible
    - Use a professional tone to answer the user's question"""
)

def handle_offtopic_query(query: str) -> str:
    """Handle non-medical queries."""
    response = f"""I'm specialized in medical information extraction and diagnosis generation. 
    Your query: "{query}"
    
    This appears to be outside my medical expertise. I can help you with:
    - Extracting symptoms, patient information, and consultation reasons from medical texts
    - Generating medical diagnoses and treatment plans
    - Processing medical transcriptions
    
    Please provide medical-related text for me to analyze."""
    return response

# Create off-topic agent
offtopic_agent = create_react_agent(
    model=model,
    tools=[handle_offtopic_query],
    name="offtopic_expert",
    prompt="""You are an off-topic handler for a medical system. When users ask non-medical questions,
    politely redirect them to medical-related queries. Use the handle_offtopic_query tool for all requests."""
)

# Create supervisor workflow with memory
checkpointer = InMemorySaver()
store = InMemoryStore()

workflow = create_supervisor(
    [medical_agent, offtopic_agent],
    model=model,
    prompt="""You are a medical system supervisor managing a medical expert and an off-topic handler.
    
    Route queries as follows:
    - For medical text extraction, diagnosis generation, or any medical-related queries: use medical_expert
    - For non-medical questions or general conversation: use offtopic_expert
    
    Medical queries include:
    - Patient symptoms extraction
    - Medical transcription processing
    - Diagnosis generation
    - Treatment plan creation
    - Medical data structuring
    
    IMPORTANT: After the agent completes their work, you must return their complete response exactly as they provided it. 
    Do not summarize or paraphrase their output. Simply pass through their full response to the user.""",
    add_handoff_messages=True
)

# Compile the workflow with memory
app = workflow.compile(
    checkpointer=checkpointer,
    store=store
)

def run_medical_extraction(user_input: str, thread_id: str = "default"):
    """Run the medical extraction system with pretty printing."""
    print("=" * 80)
    print("MEDICAL INFORMATION EXTRACTION SYSTEM")
    print("=" * 80)
    print(f"Input: {user_input}")
    print("-" * 80)
    
    config = {"configurable": {"thread_id": thread_id}}
    
    result = app.invoke({
        "messages": [
            {
                "role": "user",
                "content": user_input
            }
        ]
    }, config=config)
    
    print("CONVERSATION FLOW:")
    print("-" * 80)
    
    for i, message in enumerate(result["messages"], 1):
        print(f"Message {i}:")
        print(f"Type: {type(message).__name__}")
        if hasattr(message, 'name') and message.name:
            print(f"Agent: {message.name}")
        if hasattr(message, 'tool_calls') and message.tool_calls:
            print(f"Tool Calls: {[tc['name'] for tc in message.tool_calls]}")
        print(f"Content: {message.content}")
        print("-" * 40)
    
    print("FINAL RESPONSE:")
    print("=" * 80)
    final_message = result["messages"][-1]
    pprint.pprint(final_message.content, width=80)
    print("=" * 80)
    
    return result

if __name__ == "__main__":
    # Test cases
    test_cases = [
        """Patient John Doe, age 35, ID: 12345678, came to the clinic complaining of severe headache, 
        nausea, and dizziness that started 3 days ago. He reports difficulty concentrating and sensitivity 
        to light. The patient mentions he has been under significant stress at work lately.""",
        
        "What's the weather like today?",
        
        """Maria Rodriguez, 28 years old, phone: 555-0123, presents with persistent cough, fever of 102°F, 
        and shortness of breath. Symptoms began 5 days ago and have progressively worsened. She reports 
        fatigue and loss of appetite. Reason for visit: respiratory symptoms evaluation."""
    ]
    
    for i, test_case in enumerate(test_cases, 1):
        print(f"\n{'='*100}")
        print(f"TEST CASE {i}")
        print(f"{'='*100}")
        run_medical_extraction(test_case, f"test_thread_{i}")
        input("\nPress Enter to continue to next test case...")