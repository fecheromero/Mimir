from app.core.config import get_settings
from app.core.llm_factory import get_llm_for_test_generation

settings = get_settings()


class TestCaseAgent:
    """Use LLM model to generate test cases based on ticket descriptions."""

    def __init__(self):
        self.client = get_llm_for_test_generation()
        self.model = settings.test_case_agent_model

    def generate_test_case(self, ticket_id: str, description: str) -> str:
        """
        Generate test case steps from a ticket description.

        Args:
            ticket_id: Identifier for the ticket
            description: The ticket description/requirements

        Returns:
            String containing test case steps
        """
        system_prompt = """
            You are a testing expert. Given a Ticket which describes a change request, generate the steps to test the expected
            behaviour in a web page.
            Follow these guidelines:
            1. For each scenario only describe the steps to test the expected behaviour.
            2. Do not include any additional sections such as Title, Objective, Prerequisites, Notes or Post-conditions.
            3. Generate clear, actionable test steps that can be automated.
        """

        message = f"""
            Ticket id: {ticket_id}

            Ticket description: {description}

            Generate a test case with the required actions to verify the functionality described in the ticket.
            """

        response = self.client.messages.create(
            model=self.model,
            max_tokens=4000,
            system=system_prompt,
            messages=[
                {"role": "user", "content": message}
            ]
        )

        test_case = response.content[0].text
        return test_case
